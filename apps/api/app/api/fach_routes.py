"""Fach-Routen: Belege, Rückfragen, Klärungsfälle, Vorjahres-Import."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import OrgZugriff, current_user, org_zugriff, require_org
from app.db import get_db
from app.models.fach import Beleg, Klaerungsfall, Rueckfrage, RueckfrageNachricht
from app.services import audit, vorjahr

router = APIRouter(tags=["fach"])


# --------------------------------------------------------------------------- #
# Belege
# --------------------------------------------------------------------------- #
class BelegIn(BaseModel):
    quelle: str = "upload"      # mail|upload|erechnung
    art: str = "pdf"
    datei_name: str | None = None
    absender: str | None = None
    lieferant: str | None = None
    rechnungs_nr: str | None = None
    rechnungs_datum: date | None = None
    betrag_brutto: float | None = None
    konto_vorschlag: str | None = None
    extraktion: dict | None = None


@router.post("/orgs/{org_id}/belege")
def beleg_anlegen(
    org_id: int, body: BelegIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    b = Beleg(org_id=org_id, **body.model_dump(),
              status="extrahiert" if body.lieferant else "neu")
    db.add(b)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="beleg.angelegt")
    db.commit()
    db.refresh(b)
    return {"id": b.id, "status": b.status}


@router.get("/orgs/{org_id}/belege")
def belege_liste(
    org_id: int, status: str | None = None,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Beleg).where(Beleg.org_id == org_id)
    if status:
        q = q.where(Beleg.status == status)
    return [
        {"id": b.id, "quelle": b.quelle, "art": b.art, "lieferant": b.lieferant,
         "rechnungs_nr": b.rechnungs_nr, "betrag_brutto":
             str(b.betrag_brutto) if b.betrag_brutto is not None else None,
         "konto_vorschlag": b.konto_vorschlag, "status": b.status,
         "tx_id": b.tx_id}
        for b in db.scalars(q.order_by(Beleg.id.desc()).limit(200))
    ]


# --------------------------------------------------------------------------- #
# Rückfragen (Kanzlei ↔ Unternehmen, an der Buchung)
# --------------------------------------------------------------------------- #
class RueckfrageIn(BaseModel):
    journal_id: int
    text: str
    konto_vorschlag: str | None = None


@router.post("/orgs/{org_id}/rueckfragen")
def rueckfrage_erstellen(
    org_id: int, body: RueckfrageIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    r = Rueckfrage(org_id=org_id, journal_id=body.journal_id,
                   created_by=z.user.id)
    db.add(r)
    db.flush()
    db.add(RueckfrageNachricht(rueckfrage_id=r.id, user_id=z.user.id,
                               text=body.text,
                               konto_vorschlag=body.konto_vorschlag))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="rueckfrage.erstellt",
              objekt=f"journal:{body.journal_id}")
    db.commit()
    return {"id": r.id}


class AntwortIn(BaseModel):
    text: str
    schliessen: bool = False


@router.post("/rueckfragen/{rueckfrage_id}/antworten")
def rueckfrage_antworten(
    rueckfrage_id: int, body: AntwortIn,
    user=Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    r = db.get(Rueckfrage, rueckfrage_id)
    if r is None:
        raise HTTPException(404, "Rückfrage nicht gefunden")
    z = org_zugriff(r.org_id, user, db)  # Mitglied ODER Kanzlei mit Mandat
    db.add(RueckfrageNachricht(rueckfrage_id=r.id, user_id=z.user.id,
                               text=body.text))
    r.status = "geschlossen" if body.schliessen else "beantwortet"
    audit.log(db, org_id=r.org_id, user_id=z.user.id,
              aktion="rueckfrage.beantwortet", objekt=f"rueckfrage:{r.id}")
    db.commit()
    return {"id": r.id, "status": r.status}


@router.get("/orgs/{org_id}/rueckfragen")
def rueckfragen_liste(
    org_id: int, status: str | None = "offen",
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Rueckfrage).where(Rueckfrage.org_id == org_id)
    if status:
        q = q.where(Rueckfrage.status == status)
    out = []
    for r in db.scalars(q.order_by(Rueckfrage.id.desc()).limit(100)):
        nachrichten = db.scalars(
            select(RueckfrageNachricht)
            .where(RueckfrageNachricht.rueckfrage_id == r.id)
            .order_by(RueckfrageNachricht.id)
        ).all()
        out.append({
            "id": r.id, "journal_id": r.journal_id, "status": r.status,
            "nachrichten": [
                {"user_id": n.user_id, "text": n.text,
                 "konto_vorschlag": n.konto_vorschlag,
                 "zeit": n.created_at.isoformat()}
                for n in nachrichten
            ],
        })
    return out


# --------------------------------------------------------------------------- #
# Klärungsfälle (Kassen-Kürzungen)
# --------------------------------------------------------------------------- #
@router.get("/orgs/{org_id}/klaerungsfaelle")
def klaerungsfaelle(
    org_id: int, status: str | None = "offen",
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Klaerungsfall).where(Klaerungsfall.org_id == org_id)
    if status:
        q = q.where(Klaerungsfall.status == status)
    return [
        {"id": k.id, "titel": k.titel, "betrag": str(k.betrag),
         "kostentraeger": k.kostentraeger,
         "frist": k.frist.isoformat() if k.frist else None,
         "status": k.status, "notiz": k.notiz}
        for k in db.scalars(q.order_by(Klaerungsfall.frist))
    ]


# --------------------------------------------------------------------------- #
# Vorjahres-Import (U0 Bilanzkontinuität)
# --------------------------------------------------------------------------- #
class VorjahrIn(BaseModel):
    jahr: int
    datei_name: str | None = None
    konten: list[dict]  # [{nummer, bezeichnung, saldo}]


@router.post("/orgs/{org_id}/vorjahr")
def vorjahr_import(
    org_id: int, body: VorjahrIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    res = vorjahr.uebernehmen(db, org_id, body.jahr, body.konten, body.datei_name)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="vorjahr.import",
              details={"jahr": body.jahr, "konten": res["konten"]})
    db.commit()
    return res
