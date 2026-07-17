"""Kontoklar-API — Fibu-Kern mit echtem Login, Rollen und Kanzlei-Mandaten.

Produktionsniveau-Datenmodell: Orgs/User/Sessions, Kontenrahmen-Seed beim
Anlegen, Bank/Journal/OPOS/Stapel, Belege, Rückfragen, Klärungsfälle,
Vorjahres-Import (Bilanzkontinuität), Audit-Log. Das Frontend muss nur noch
verbunden werden.
"""
from datetime import date
from decimal import Decimal

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.api.auth_routes import router as auth_router
from app.api.fach_routes import router as fach_router
from app.api.kanzlei_routes import router as kanzlei_router
from app.core.auth import OrgZugriff, current_user, org_zugriff, require_org
from app.core.settings import settings
from app.db import Base, engine, get_db
from app.models.bank import BankKonto
from app.models.fibu import DatevStapel, Journal, Personenkonto
from app.models.org import Org, OrgMember, User
from app.services import audit, autopilot, csv_import, extf, kontierung, saldenabgleich
from app.services.chart_profile import get_profile
from app.services.history import name_key, norm
from app.services.skr_seed import seed_kontenrahmen

app = FastAPI(title="Kontoklar API", version="0.2.0")
app.include_router(auth_router)
app.include_router(kanzlei_router)
app.include_router(fach_router)


@app.on_event("startup")
def _startup() -> None:
    if settings.create_all_on_startup:
        Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Orgs
# --------------------------------------------------------------------------- #
class OrgIn(BaseModel):
    name: str
    art: str = "unternehmen"
    chart: str = "SKR45"
    datev_berater_nr: str | None = None
    datev_mandant_nr: str | None = None


@app.post("/orgs")
def org_anlegen(
    body: OrgIn, user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    org = Org(**body.model_dump())
    db.add(org)
    db.flush()
    db.add(OrgMember(org_id=org.id, user_id=user.id, rolle="inhaber"))
    prof = get_profile(org.chart)
    if org.art == "unternehmen":
        seed_kontenrahmen(db, org.id, org.chart)
        db.add(BankKonto(org_id=org.id, name="Bank", sachkonto=prof.bank))
    audit.log(db, org_id=org.id, user_id=user.id, aktion="org.angelegt",
              details={"art": org.art, "chart": org.chart})
    db.commit()
    return {"id": org.id, "name": org.name, "chart": org.chart,
            "bank_sachkonto": prof.bank}


@app.get("/orgs")
def orgs_liste(
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> list[dict]:
    """Nur die eigenen Orgs (Mitgliedschaften)."""
    out = []
    for m in db.scalars(select(OrgMember).where(OrgMember.user_id == user.id)):
        o = db.get(Org, m.org_id)
        if o:
            out.append({"id": o.id, "name": o.name, "art": o.art,
                        "chart": o.chart, "rolle": m.rolle})
    return out


# --------------------------------------------------------------------------- #
# Bank: CSV-Import
# --------------------------------------------------------------------------- #
@app.post("/orgs/{org_id}/bank/import-csv")
def bank_import_csv(
    org_id: int, csv_text: str = Body(..., embed=True),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    konto = db.scalar(select(BankKonto).where(BankKonto.org_id == org_id))
    if konto is None:
        raise HTTPException(400, "Kein Bankkonto angelegt")
    try:
        res = csv_import.import_csv(db, org_id, konto, csv_text)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="bank.csv_import",
              details=res)
    db.commit()
    return res


# --------------------------------------------------------------------------- #
# Personenkonten
# --------------------------------------------------------------------------- #
class PersonenkontoIn(BaseModel):
    typ: str
    name: str
    iban: str | None = None
    kanon: str | None = None


@app.post("/orgs/{org_id}/personenkonten")
def personenkonto_anlegen(
    org_id: int, body: PersonenkontoIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    prof = get_profile(z.org.chart)
    start = prof.debitor_start if body.typ == "debitor" else prof.kreditor_start
    max_nr = 0
    for (nr,) in db.execute(
        select(Personenkonto.nummer).where(
            Personenkonto.org_id == org_id, Personenkonto.typ == body.typ
        )
    ):
        try:
            max_nr = max(max_nr, int(nr))
        except ValueError:
            pass
    nummer = str(max(start, max_nr + 1) if max_nr else start)
    pk = Personenkonto(
        org_id=org_id, typ=body.typ, nummer=nummer, name=body.name,
        name_norm=norm(body.name), name_key=name_key(body.name),
        iban=(body.iban or "").replace(" ", "").upper() or None,
        kanon=body.kanon,
    )
    db.add(pk)
    db.commit()
    db.refresh(pk)
    return {"id": pk.id, "typ": pk.typ, "nummer": pk.nummer, "name": pk.name}


@app.get("/orgs/{org_id}/personenkonten")
def personenkonten_liste(
    org_id: int, typ: str | None = Query(None),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Personenkonto).where(Personenkonto.org_id == org_id)
    if typ:
        q = q.where(Personenkonto.typ == typ)
    return [
        {"id": p.id, "typ": p.typ, "nummer": p.nummer, "name": p.name,
         "iban": p.iban, "kanon": p.kanon}
        for p in db.scalars(q.order_by(Personenkonto.nummer))
    ]


# --------------------------------------------------------------------------- #
# Kontierung / Journal / Autopilot
# --------------------------------------------------------------------------- #
@app.post("/orgs/{org_id}/propose")
def propose(
    org_id: int, force: bool = Query(False),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    res = kontierung.propose(db, org_id, force=force)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="kontierung.propose",
              details=res)
    db.commit()
    return res


@app.get("/orgs/{org_id}/journal")
def journal_liste(
    org_id: int, status: str | None = Query(None), limit: int = Query(200, le=1000),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Journal).where(Journal.org_id == org_id)
    if status:
        q = q.where(Journal.status == status)
    rows = db.scalars(q.order_by(Journal.beleg_datum.desc(), Journal.id.desc()).limit(limit))
    return [
        {
            "id": j.id, "datum": j.beleg_datum.isoformat(), "betrag": str(j.betrag),
            "soll": j.soll, "haben": j.haben, "bu": j.bu, "text": j.text,
            "partner": j.partner_name, "partner_nr": j.partner_nr,
            "status": j.status, "origin": j.origin,
            "confidence": str(j.confidence), "begruendung": j.begruendung,
            "entschieden_via": j.entschieden_via,
        }
        for j in rows
    ]


class JournalPatch(BaseModel):
    status: str | None = None
    konto: str | None = None
    bu: int | None = None
    als_regel: bool = False


@app.patch("/journal/{journal_id}")
def journal_patch(
    journal_id: int, body: JournalPatch,
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    j = db.get(Journal, journal_id)
    if j is None:
        raise HTTPException(404, "Buchung nicht gefunden")
    z = org_zugriff(j.org_id, user, db)
    prof = get_profile(z.org.chart)
    if body.konto:
        bank_konten = {
            k.sachkonto for k in db.scalars(
                select(BankKonto).where(BankKonto.org_id == j.org_id)
            )
        } or {prof.bank}
        if j.soll in bank_konten:
            j.haben = body.konto
        elif j.haben in bank_konten:
            j.soll = body.konto
        else:
            raise HTTPException(400, "Buchung ohne Bank-Seite — Konto nicht änderbar")
        j.origin = "manuell"
        j.confidence = Decimal("1.00")
    if body.bu is not None:
        j.bu = body.bu
    if body.status:
        if body.status not in ("bestaetigt", "abgelehnt", "vorgeschlagen"):
            raise HTTPException(400, "Ungültiger Status")
        j.status = body.status
        j.entschieden_via = (
            None if body.status == "vorgeschlagen"
            else ("kanzlei" if z.rolle == "kanzlei" else "mensch")
        )
    regel_id = None
    if body.als_regel and j.partner_nr:
        pk = db.scalar(
            select(Personenkonto).where(
                Personenkonto.org_id == j.org_id,
                Personenkonto.nummer == j.partner_nr,
            )
        )
        if pk:
            konto = j.haben if prof.richtung(j.soll, j.haben) == "einnahme" else j.soll
            regel = kontierung.lerne_regel(db, j.org_id, pk.id, konto, j.bu)
            regel_id = regel.id
    audit.log(db, org_id=j.org_id, user_id=user.id, aktion="journal.patch",
              objekt=f"journal:{j.id}",
              details={"status": body.status, "konto": body.konto,
                       "als_regel": body.als_regel, "rolle": z.rolle})
    db.commit()
    return {"id": j.id, "status": j.status, "soll": j.soll, "haben": j.haben,
            "regel_id": regel_id}


@app.post("/orgs/{org_id}/autopilot/run")
def autopilot_run(
    org_id: int, dry_run: bool = Query(False),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    res = autopilot.run(db, org_id, dry_run=dry_run)
    if not dry_run:
        audit.log(db, org_id=org_id, user_id=z.user.id,
                  aktion="autopilot.run", details=res)
        db.commit()
    return res


@app.post("/orgs/{org_id}/autopilot/revert")
def autopilot_revert(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    n = autopilot.revert(db, org_id)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="autopilot.revert",
              details={"zurueckgeholt": n})
    db.commit()
    return {"zurueckgeholt": n}


# --------------------------------------------------------------------------- #
# Cent-Anker + DATEV
# --------------------------------------------------------------------------- #
@app.get("/orgs/{org_id}/saldenabgleich")
def saldo(
    org_id: int, jahr: int = Query(...),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    return saldenabgleich.compute(db, org_id, jahr)


@app.post("/orgs/{org_id}/datev/stapel")
def stapel_bauen(
    org_id: int, von: date = Body(...), bis: date = Body(...),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    try:
        s = extf.build_stapel(db, org_id, von, bis)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="datev.stapel_erstellt",
              objekt=f"stapel:{s.id}", details={"saetze": s.saetze})
    db.commit()
    return {"id": s.id, "saetze": s.saetze, "status": s.status}


@app.get("/orgs/{org_id}/datev/stapel")
def stapel_liste(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    return [
        {"id": s.id, "von": s.von.isoformat(), "bis": s.bis.isoformat(),
         "status": s.status, "saetze": s.saetze}
        for s in db.scalars(
            select(DatevStapel).where(DatevStapel.org_id == org_id)
            .order_by(DatevStapel.id.desc()).limit(50)
        )
    ]


def _stapel_mit_zugriff(stapel_id: int, user: User, db: DbSession) -> DatevStapel:
    s = db.get(DatevStapel, stapel_id)
    if s is None:
        raise HTTPException(404, "Stapel nicht gefunden")
    org_zugriff(s.org_id, user, db)
    return s


@app.get("/datev/stapel/{stapel_id}/extf")
def stapel_extf(
    stapel_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> Response:
    s = _stapel_mit_zugriff(stapel_id, user, db)
    name, inhalt = extf.extf_bytes(db, s)
    audit.log(db, org_id=s.org_id, user_id=user.id, aktion="datev.extf_export",
              objekt=f"stapel:{s.id}")
    db.commit()
    return Response(
        content=inhalt, media_type="text/csv; charset=latin-1",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@app.post("/datev/stapel/{stapel_id}/uebernommen")
def stapel_uebernommen(
    stapel_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    s = _stapel_mit_zugriff(stapel_id, user, db)
    n = extf.markiere_uebernommen(db, s)
    audit.log(db, org_id=s.org_id, user_id=user.id, aktion="datev.uebernommen",
              objekt=f"stapel:{s.id}", details={"gebucht": n})
    db.commit()
    return {"gebucht": n}
