"""Kontoklar-API — P0: Kern-Fibu-Services hinter einer schlanken HTTP-Schicht.

Auth ist in P0 bewusst ein Dev-Token (Header ``Authorization: Bearer …``);
die TENANCY ist trotzdem von Anfang an strikt: jede Fachoperation läuft über
eine explizite ``org_id`` und jede Tabelle trägt sie als Fremdschlüssel.
"""
from datetime import date
from decimal import Decimal

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_token
from app.core.settings import settings
from app.db import Base, engine, get_db
from app.models.bank import BankKonto, BankTransaktion
from app.models.fibu import DatevStapel, Journal, Personenkonto
from app.models.org import Org
from app.services import autopilot, csv_import, extf, kontierung, saldenabgleich
from app.services.chart_profile import get_profile
from app.services.history import name_key, norm

app = FastAPI(title="Kontoklar API", version="0.1.0")


@app.on_event("startup")
def _startup() -> None:
    if settings.create_all_on_startup:
        # Dev/Test-Komfort; vor Pilotbetrieb als Alembic-0001 eingefroren.
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


@app.post("/orgs", dependencies=[Depends(require_token)])
def org_anlegen(body: OrgIn, db: Session = Depends(get_db)) -> dict:
    org = Org(**body.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    prof = get_profile(org.chart)
    # Erstes Bankkonto mit Profil-Sachkonto gleich mit anlegen (Onboarding).
    konto = BankKonto(org_id=org.id, name="Bank", sachkonto=prof.bank)
    db.add(konto)
    db.commit()
    return {"id": org.id, "name": org.name, "chart": org.chart,
            "bank_sachkonto": prof.bank}


@app.get("/orgs", dependencies=[Depends(require_token)])
def orgs_liste(db: Session = Depends(get_db)) -> list[dict]:
    return [
        {"id": o.id, "name": o.name, "art": o.art, "chart": o.chart}
        for o in db.scalars(select(Org).order_by(Org.id))
    ]


def _org_oder_404(db: Session, org_id: int) -> Org:
    org = db.get(Org, org_id)
    if org is None:
        raise HTTPException(404, "Org nicht gefunden")
    return org


# --------------------------------------------------------------------------- #
# Bank: CSV-Import
# --------------------------------------------------------------------------- #
@app.post("/orgs/{org_id}/bank/import-csv", dependencies=[Depends(require_token)])
def bank_import_csv(
    org_id: int, csv_text: str = Body(..., embed=True),
    db: Session = Depends(get_db),
) -> dict:
    _org_oder_404(db, org_id)
    konto = db.scalar(select(BankKonto).where(BankKonto.org_id == org_id))
    if konto is None:
        raise HTTPException(400, "Kein Bankkonto angelegt")
    try:
        return csv_import.import_csv(db, org_id, konto, csv_text)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


# --------------------------------------------------------------------------- #
# Personenkonten (Kostenträger & Co.)
# --------------------------------------------------------------------------- #
class PersonenkontoIn(BaseModel):
    typ: str  # debitor|kreditor
    name: str
    iban: str | None = None
    kanon: str | None = None


@app.post("/orgs/{org_id}/personenkonten", dependencies=[Depends(require_token)])
def personenkonto_anlegen(
    org_id: int, body: PersonenkontoIn, db: Session = Depends(get_db),
) -> dict:
    org = _org_oder_404(db, org_id)
    prof = get_profile(org.chart)
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


# --------------------------------------------------------------------------- #
# Kontierung / Journal / Autopilot
# --------------------------------------------------------------------------- #
@app.post("/orgs/{org_id}/propose", dependencies=[Depends(require_token)])
def propose(org_id: int, force: bool = Query(False), db: Session = Depends(get_db)) -> dict:
    _org_oder_404(db, org_id)
    return kontierung.propose(db, org_id, force=force)


@app.get("/orgs/{org_id}/journal", dependencies=[Depends(require_token)])
def journal_liste(
    org_id: int, status: str | None = Query(None), limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
) -> list[dict]:
    _org_oder_404(db, org_id)
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
    status: str | None = None          # bestaetigt | abgelehnt | vorgeschlagen
    konto: str | None = None           # neues Gegenkonto (Bank-Seite bleibt fix)
    bu: int | None = None
    als_regel: bool = False            # Partner-Regel aus dieser Entscheidung lernen


@app.patch("/journal/{journal_id}", dependencies=[Depends(require_token)])
def journal_patch(journal_id: int, body: JournalPatch, db: Session = Depends(get_db)) -> dict:
    j = db.get(Journal, journal_id)
    if j is None:
        raise HTTPException(404, "Buchung nicht gefunden")
    org = db.get(Org, j.org_id)
    prof = get_profile(org.chart if org else None)
    if body.konto:
        # Bank-Seite ermitteln (Bank kann 1261/1262 … sein → über BankKonto-Liste).
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
        j.entschieden_via = "mensch" if body.status != "vorgeschlagen" else None
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
    db.commit()
    return {"id": j.id, "status": j.status, "soll": j.soll, "haben": j.haben,
            "regel_id": regel_id}


@app.post("/orgs/{org_id}/autopilot/run", dependencies=[Depends(require_token)])
def autopilot_run(org_id: int, dry_run: bool = Query(False), db: Session = Depends(get_db)) -> dict:
    _org_oder_404(db, org_id)
    return autopilot.run(db, org_id, dry_run=dry_run)


@app.post("/orgs/{org_id}/autopilot/revert", dependencies=[Depends(require_token)])
def autopilot_revert(org_id: int, db: Session = Depends(get_db)) -> dict:
    _org_oder_404(db, org_id)
    return {"zurueckgeholt": autopilot.revert(db, org_id)}


# --------------------------------------------------------------------------- #
# Cent-Anker + DATEV
# --------------------------------------------------------------------------- #
@app.get("/orgs/{org_id}/saldenabgleich", dependencies=[Depends(require_token)])
def saldo(org_id: int, jahr: int = Query(...), db: Session = Depends(get_db)) -> dict:
    _org_oder_404(db, org_id)
    return saldenabgleich.compute(db, org_id, jahr)


@app.post("/orgs/{org_id}/datev/stapel", dependencies=[Depends(require_token)])
def stapel_bauen(
    org_id: int, von: date = Body(...), bis: date = Body(...),
    db: Session = Depends(get_db),
) -> dict:
    _org_oder_404(db, org_id)
    try:
        s = extf.build_stapel(db, org_id, von, bis)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {"id": s.id, "saetze": s.saetze, "status": s.status}


@app.get("/datev/stapel/{stapel_id}/extf", dependencies=[Depends(require_token)])
def stapel_extf(stapel_id: int, db: Session = Depends(get_db)) -> Response:
    s = db.get(DatevStapel, stapel_id)
    if s is None:
        raise HTTPException(404, "Stapel nicht gefunden")
    name, inhalt = extf.extf_bytes(db, s)
    return Response(
        content=inhalt, media_type="text/csv; charset=latin-1",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@app.post("/datev/stapel/{stapel_id}/uebernommen", dependencies=[Depends(require_token)])
def stapel_uebernommen(stapel_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(DatevStapel, stapel_id)
    if s is None:
        raise HTTPException(404, "Stapel nicht gefunden")
    return {"gebucht": extf.markiere_uebernommen(db, s)}
