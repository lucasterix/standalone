"""Kontoklar-API — Fibu-Kern mit echtem Login, Rollen und Kanzlei-Mandaten.

Produktionsniveau-Datenmodell: Orgs/User/Sessions, Kontenrahmen-Seed beim
Anlegen, Bank/Journal/OPOS/Stapel, Belege, Rückfragen, Klärungsfälle,
Vorjahres-Import (Bilanzkontinuität), Audit-Log. Das Frontend muss nur noch
verbunden werden.
"""
from datetime import date
from decimal import Decimal

from fastapi import (
    Body, Depends, FastAPI, HTTPException, Query, Response, UploadFile,
)
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.api.auth_routes import router as auth_router
from app.api.fach_routes import router as fach_router
from app.api.kanzlei_routes import router as kanzlei_router
from app.api.personal_routes import router as personal_router
from app.api.verkauf_routes import router as verkauf_router
from app.core.auth import OrgZugriff, current_user, org_zugriff, require_org
from app.core.settings import settings
from app.db import Base, engine, get_db
from app.models.bank import BankKonto
from app.models.bankverbindung import BankVerbindung
from app.models.fach import Beleg
from app.models.fibu import DatevStapel, Journal, PartnerRegel, Personenkonto
from app.models.org import Org, OrgMember, User
from app.services import (
    audit, autopilot, bank_sync, csv_import, einstellungen, exporte, extf,
    kontierung, saldenabgleich,
)
from app.services.chart_profile import get_profile
from app.services.history import name_key, norm
from app.services.skr_seed import seed_kontenrahmen

app = FastAPI(title="Kontoklar API", version="0.2.0")
app.include_router(auth_router)
app.include_router(kanzlei_router)
app.include_router(fach_router)
app.include_router(verkauf_router)
app.include_router(personal_router)


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


@app.post("/orgs/{org_id}/bank/upload")
async def bank_upload(
    org_id: int, datei: UploadFile,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    """Browser-Upload: CSV-Datei rein → Import + Kontierung + Autopilot in
    einem Zug. Antwort sagt, was passiert ist — die Zahlen, nicht der Vorgang,
    sind der Magic Moment."""
    roh = await datei.read()
    if len(roh) > 10 * 1024 * 1024:
        raise HTTPException(413, "Datei zu groß (max. 10 MB)")
    text = None
    for enc in ("utf-8-sig", "latin-1"):
        try:
            text = roh.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise HTTPException(400, "Datei ist keine lesbare CSV (UTF-8/Latin-1)")
    konto = db.scalar(select(BankKonto).where(BankKonto.org_id == org_id))
    if konto is None:
        raise HTTPException(400, "Kein Bankkonto angelegt")
    try:
        imp = csv_import.import_csv(db, org_id, konto, text)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    prop = kontierung.propose(db, org_id)
    auto = autopilot.run(db, org_id)
    res = {
        "neu": imp.get("neu", 0),
        "uebersprungen": imp.get("uebersprungen", 0),
        "vorgeschlagen": prop.get("neu", 0),
        "auto_gebucht": auto.get("bestaetigt", 0),
    }
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="bank.upload",
              details={"datei": datei.filename, **res})
    db.commit()
    return res


# --------------------------------------------------------------------------- #
# Bank: PSD2-Verbindung (EnableBanking, env-gated)
# --------------------------------------------------------------------------- #
@app.get("/orgs/{org_id}/bank/verbindung")
def bank_verbindung_status(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    v = db.scalar(select(BankVerbindung).where(BankVerbindung.org_id == org_id))
    return {
        "konfiguriert": bank_sync.konfiguriert(),
        "status": v.status if v else "getrennt",
        "iban": v.account_iban if v else None,
        "bank": v.account_name if v else None,
        "gueltig_bis": v.gueltig_bis.isoformat() if v and v.gueltig_bis else None,
        "letzter_sync": v.letzter_sync.isoformat() if v and v.letzter_sync else None,
    }


class VerbindenIn(BaseModel):
    bank_name: str
    bank_land: str = "DE"


@app.post("/orgs/{org_id}/bank/verbinden")
def bank_verbinden(
    org_id: int, body: VerbindenIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Bankverbindung stellt nur das Unternehmen her")
    if not bank_sync.konfiguriert():
        raise HTTPException(503, "PSD2 noch nicht freigeschaltet — CSV-Import nutzen")
    url = bank_sync.auth_starten(org_id, body.bank_name, body.bank_land)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="bank.verbinden",
              details={"bank": body.bank_name})
    db.commit()
    return {"auth_url": url}


class CallbackIn(BaseModel):
    code: str
    state: str


@app.post("/orgs/{org_id}/bank/callback")
def bank_callback(
    org_id: int, body: CallbackIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if bank_sync.state_pruefen(body.state) != org_id:
        raise HTTPException(400, "State-Prüfung fehlgeschlagen")
    v = bank_sync.session_erstellen(db, org_id, body.code)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="bank.verbunden",
              details={"iban": v.account_iban})
    db.commit()
    return {"status": v.status, "iban": v.account_iban, "bank": v.account_name}


@app.post("/orgs/{org_id}/bank/sync")
def bank_sync_jetzt(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    try:
        res = bank_sync.sync(db, org_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    prop = kontierung.propose(db, org_id)
    auto = autopilot.run(db, org_id)
    res.update({"vorgeschlagen": prop.get("neu", 0),
                "auto_gebucht": auto.get("bestaetigt", 0)})
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="bank.sync", details=res)
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
    jahr: int | None = Query(None), monat: int | None = Query(None, ge=1, le=12),
    suche: str | None = Query(None, max_length=80),
    ohne_beleg: bool = Query(False),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Journal).where(Journal.org_id == org_id)
    if status:
        q = q.where(Journal.status == status)
    if jahr:
        q = q.where(Journal.jahr == jahr)
    if monat and jahr:
        von = date(jahr, monat, 1)
        bis = date(jahr + (monat == 12), (monat % 12) + 1, 1)
        q = q.where(Journal.beleg_datum >= von, Journal.beleg_datum < bis)
    if suche:
        muster = f"%{suche.strip()}%"
        q = q.where(
            Journal.partner_name.ilike(muster)
            | Journal.text.ilike(muster)
            | (Journal.soll == suche.strip())
            | (Journal.haben == suche.strip())
        )
    rows = db.scalars(q.order_by(Journal.beleg_datum.desc(), Journal.id.desc()).limit(limit))
    bank_konten = {
        k.sachkonto for k in db.scalars(
            select(BankKonto).where(BankKonto.org_id == org_id)
        )
    }
    belegte_tx = {
        b.tx_id for b in db.scalars(
            select(Beleg).where(Beleg.org_id == org_id, Beleg.tx_id.isnot(None))
        )
    }
    def _richtung(j: Journal) -> str:
        if j.soll in bank_konten:
            return "einnahme"
        if j.haben in bank_konten:
            return "ausgabe"
        return "neutral"
    ergebnis = [
        {
            "id": j.id, "datum": j.beleg_datum.isoformat(), "betrag": str(j.betrag),
            "richtung": _richtung(j),
            "soll": j.soll, "haben": j.haben, "bu": j.bu, "text": j.text,
            "partner": j.partner_name, "partner_nr": j.partner_nr,
            "status": j.status, "origin": j.origin,
            "confidence": str(j.confidence), "begruendung": j.begruendung,
            "entschieden_via": j.entschieden_via,
            "beleg": j.tx_id in belegte_tx,
        }
        for j in rows
    ]
    if ohne_beleg:
        # GoBD-Blick: bestätigte/gebuchte AUSGABEN ohne angehängten Beleg.
        ergebnis = [r for r in ergebnis
                    if r["richtung"] == "ausgabe" and not r["beleg"]
                    and r["status"] in ("bestaetigt", "gebucht")]
    return ergebnis


def _journal_untertitel(jahr: int | None, monat: int | None,
                        status: str | None) -> str:
    teile = []
    if monat and jahr:
        teile.append(f"{monat:02d}/{jahr}")
    elif jahr:
        teile.append(str(jahr))
    teile.append(status or "alle Status")
    return " · ".join(teile)


@app.get("/orgs/{org_id}/journal/export.csv")
def journal_export_csv(
    org_id: int, status: str | None = Query(None),
    jahr: int | None = Query(None), monat: int | None = Query(None, ge=1, le=12),
    suche: str | None = Query(None, max_length=80),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> Response:
    rows = journal_liste(org_id, status, 1000, jahr, monat, suche, False, z, db)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="journal.export_csv",
              details={"saetze": len(rows)})
    db.commit()
    return Response(
        content=exporte.journal_csv(rows), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="buchungsjournal.csv"'},
    )


@app.get("/orgs/{org_id}/journal/export.pdf")
def journal_export_pdf(
    org_id: int, status: str | None = Query(None),
    jahr: int | None = Query(None), monat: int | None = Query(None, ge=1, le=12),
    suche: str | None = Query(None, max_length=80),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> Response:
    rows = journal_liste(org_id, status, 1000, jahr, monat, suche, False, z, db)
    pdf = exporte.journal_pdf(z.org, rows, _journal_untertitel(jahr, monat, status))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="journal.export_pdf",
              details={"saetze": len(rows)})
    db.commit()
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="buchungsjournal.pdf"'},
    )


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
    if j.status == "gebucht":
        raise HTTPException(
            409, "In DATEV übernommen — änderbar nur per Storno/Korrektur "
                 "über Ihre Kanzlei (Festschreibung).")
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
        j.begruendung = f"Manuell korrigiert → Konto {body.konto}"
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


# --------------------------------------------------------------------------- #
# Einstellungen des Buchungsalgorithmus + Simulation + Regeln
# --------------------------------------------------------------------------- #
class EinstellungenIn(BaseModel):
    autopilot_stufe: str | None = None
    lern_schwelle: int | None = None
    kostentraeger_modus: bool | None = None
    lohn_muster_aktiv: bool | None = None
    fallback_erloes: str | None = None
    fallback_aufwand: str | None = None
    datev_berater_nr: str | None = None
    datev_mandant_nr: str | None = None


def _einstellungen_dict(z: OrgZugriff, est) -> dict:
    prof = get_profile(z.org.chart)
    return {
        "autopilot_stufe": z.org.autopilot_stufe,
        "lern_schwelle": est.lern_schwelle,
        "kostentraeger_modus": est.kostentraeger_modus,
        "lohn_muster_aktiv": est.lohn_muster_aktiv,
        "fallback_erloes": est.fallback_erloes,
        "fallback_aufwand": est.fallback_aufwand,
        "fallback_erloes_default": prof.fallback_erloes,
        "fallback_aufwand_default": prof.fallback_aufwand,
        "datev_berater_nr": z.org.datev_berater_nr,
        "datev_mandant_nr": z.org.datev_mandant_nr,
        "chart": z.org.chart,
    }


@app.get("/orgs/{org_id}/einstellungen")
def einstellungen_lesen(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    est = einstellungen.fuer_org(db, org_id)
    db.commit()
    return _einstellungen_dict(z, est)


@app.patch("/orgs/{org_id}/einstellungen")
def einstellungen_aendern(
    org_id: int, body: EinstellungenIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Einstellungen ändert nur das Unternehmen")
    est = einstellungen.fuer_org(db, org_id)
    daten = body.model_dump(exclude_unset=True)
    if "autopilot_stufe" in daten:
        if daten["autopilot_stufe"] not in ("vorsichtig", "ausgewogen", "mutig"):
            raise HTTPException(400, "Unbekannte Autopilot-Stufe")
        z.org.autopilot_stufe = daten.pop("autopilot_stufe")
    if "lern_schwelle" in daten:
        n = daten.pop("lern_schwelle")
        if not 1 <= n <= 10:
            raise HTTPException(400, "Lern-Schwelle: 1 bis 10")
        est.lern_schwelle = n
    for feld in ("fallback_erloes", "fallback_aufwand"):
        if feld in daten:
            wert = (daten.pop(feld) or "").strip() or None
            if wert is not None and not (wert.isdigit() and len(wert) == 4):
                raise HTTPException(400, f"{feld}: 4-stelliges Sachkonto oder leer")
            setattr(est, feld, wert)
    for feld in ("kostentraeger_modus", "lohn_muster_aktiv"):
        if feld in daten:
            setattr(est, feld, bool(daten.pop(feld)))
    for feld in ("datev_berater_nr", "datev_mandant_nr"):
        if feld in daten:
            setattr(z.org, feld, (daten.pop(feld) or "").strip() or None)
    audit.log(db, org_id=org_id, user_id=z.user.id,
              aktion="einstellungen.geaendert",
              details=body.model_dump(exclude_unset=True))
    db.commit()
    return _einstellungen_dict(z, est)


@app.get("/orgs/{org_id}/autopilot/simulation")
def autopilot_simulation(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    return autopilot.simulation(db, org_id)


@app.get("/orgs/{org_id}/regeln")
def regeln_liste(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    pks = {p.id: p for p in db.scalars(
        select(Personenkonto).where(Personenkonto.org_id == org_id)
    )}
    out = []
    for r in db.scalars(
        select(PartnerRegel).where(PartnerRegel.org_id == org_id)
    ):
        pk = pks.get(r.personenkonto_id)
        gebucht = db.scalar(
            select(func.count(Journal.id)).where(
                Journal.org_id == org_id,
                Journal.partner_nr == (pk.nummer if pk else None),
                Journal.origin == "regel",
                Journal.status.in_(("bestaetigt", "gebucht")),
            )
        ) or 0
        out.append({
            "id": r.id, "konto": r.konto, "aktiv": r.aktiv, "quelle": r.quelle,
            "partner": pk.name if pk else "?",
            "partner_nr": pk.nummer if pk else None,
            "gebucht": gebucht,
        })
    out.sort(key=lambda x: -x["gebucht"])
    return out


class RegelIn(BaseModel):
    personenkonto_id: int
    konto: str


@app.post("/orgs/{org_id}/regeln")
def regel_anlegen(
    org_id: int, body: RegelIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Regeln ändert nur das Unternehmen")
    pk = db.get(Personenkonto, body.personenkonto_id)
    if pk is None or pk.org_id != org_id:
        raise HTTPException(404, "Personenkonto nicht gefunden")
    if not (body.konto.isdigit() and len(body.konto) == 4):
        raise HTTPException(400, "Konto: 4-stelliges Sachkonto")
    vorhanden = db.scalar(select(PartnerRegel).where(
        PartnerRegel.org_id == org_id,
        PartnerRegel.personenkonto_id == pk.id,
    ))
    if vorhanden is not None:
        vorhanden.konto = body.konto
        vorhanden.aktiv = True
    else:
        db.add(PartnerRegel(org_id=org_id, personenkonto_id=pk.id,
                            konto=body.konto, quelle="manuell"))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="regel.angelegt",
              details={"partner": pk.nummer, "konto": body.konto})
    db.commit()
    return {"ok": True}


class RegelPatch(BaseModel):
    aktiv: bool | None = None
    konto: str | None = None


@app.patch("/regeln/{regel_id}")
def regel_aendern(
    regel_id: int, body: RegelPatch,
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    r = db.get(PartnerRegel, regel_id)
    if r is None:
        raise HTTPException(404, "Regel nicht gefunden")
    z = org_zugriff(r.org_id, user, db)
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Regeln ändert nur das Unternehmen")
    if body.aktiv is not None:
        r.aktiv = body.aktiv
    if body.konto is not None:
        if not (body.konto.isdigit() and len(body.konto) == 4):
            raise HTTPException(400, "Konto: 4-stelliges Sachkonto")
        r.konto = body.konto
    audit.log(db, org_id=r.org_id, user_id=user.id, aktion="regel.geaendert",
              details={"regel": r.id, **body.model_dump(exclude_unset=True)})
    db.commit()
    return {"ok": True}


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
