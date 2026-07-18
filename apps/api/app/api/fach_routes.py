"""Fach-Routen: Belege, Rückfragen, Klärungsfälle, Vorjahres-Import."""
from datetime import date
from decimal import Decimal

from fastapi import (
    APIRouter, Body, Depends, Form, HTTPException, Response, UploadFile,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import OrgZugriff, current_user, org_zugriff, require_org
from app.db import get_db
from app.models.bank import BankTransaktion
from app.models.fach import BelegDatei, Beleg, Klaerungsfall, Rueckfrage, RueckfrageNachricht
from app.services import audit, belege as belege_service, ki_beleg, vorjahr

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


def _tx_dict(t: BankTransaktion) -> dict:
    return {"id": t.id, "datum": t.buchungstag.isoformat(),
            "betrag": str(t.betrag), "name": t.name, "zweck": (t.zweck or "")[:80]}


@router.post("/orgs/{org_id}/belege/upload")
async def beleg_upload(
    org_id: int, datei: UploadFile,
    betrag: str | None = Form(None), datum: str | None = Form(None),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Belege lädt nur das Unternehmen hoch")
    inhalt = await datei.read()
    if len(inhalt) > 10 * 1024 * 1024:
        raise HTTPException(413, "Datei zu groß (max. 10 MB)")
    mime = datei.content_type or "application/octet-stream"
    if not any(t in mime for t in ("pdf", "image/jpeg", "image/png")):
        raise HTTPException(400, "Bitte PDF, JPG oder PNG hochladen")

    ex = belege_service.extrahiere(inhalt, mime)
    if not ex and mime.startswith("image/"):
        ex = ki_beleg.lese_bild(inhalt, mime)
    # Nutzer-Angaben schlagen Extraktion (der Mensch weiß es besser).
    if betrag:
        try:
            ex["betrag"] = Decimal(betrag.replace(".", "").replace(",", "."))
        except Exception:
            raise HTTPException(400, "Betrag nicht lesbar (z. B. 123,45)")
    if datum:
        try:
            ex["datum"] = date.fromisoformat(datum)
        except ValueError:
            raise HTTPException(400, "Datum: JJJJ-MM-TT")

    b = Beleg(
        org_id=org_id, quelle="upload",
        art="pdf" if "pdf" in mime else "foto",
        datei_name=datei.filename,
        lieferant=ex.get("lieferant"),
        rechnungs_nr=ex.get("rechnungs_nr"),
        rechnungs_datum=ex.get("datum"),
        betrag_brutto=ex.get("betrag"),
        status="extrahiert" if ex else "neu",
    )
    db.add(b)
    db.flush()
    db.add(BelegDatei(org_id=org_id, beleg_id=b.id,
                      dateiname=datei.filename or f"beleg-{b.id}",
                      mime=mime, groesse=len(inhalt), inhalt=inhalt))
    treffer = belege_service.zuordnung_versuchen(db, b)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="beleg.upload",
              details={"beleg": b.id, "status": b.status,
                       "kandidaten": len(treffer)})
    db.commit()
    return {
        "id": b.id, "status": b.status,
        "betrag": str(b.betrag_brutto) if b.betrag_brutto is not None else None,
        "datum": b.rechnungs_datum.isoformat() if b.rechnungs_datum else None,
        "rechnungs_nr": b.rechnungs_nr,
        "tx": _tx_dict(db.get(BankTransaktion, b.tx_id)) if b.tx_id else None,
        "kandidaten": [] if b.tx_id else [_tx_dict(t) for t in treffer],
    }


@router.post("/orgs/{org_id}/belege/{beleg_id}/zuordnen")
def beleg_zuordnen(
    org_id: int, beleg_id: int, tx_id: int = Body(..., embed=True),
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    b = db.get(Beleg, beleg_id)
    if b is None or b.org_id != org_id:
        raise HTTPException(404, "Beleg nicht gefunden")
    t = db.get(BankTransaktion, tx_id)
    if t is None or t.org_id != org_id:
        raise HTTPException(404, "Transaktion nicht gefunden")
    b.tx_id = t.id
    b.status = "zugeordnet"
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="beleg.zugeordnet",
              details={"beleg": b.id, "tx": t.id})
    db.commit()
    return {"ok": True}


@router.post("/orgs/{org_id}/belege/{beleg_id}/loesen")
def beleg_loesen(
    org_id: int, beleg_id: int,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    b = db.get(Beleg, beleg_id)
    if b is None or b.org_id != org_id:
        raise HTTPException(404, "Beleg nicht gefunden")
    b.tx_id = None
    b.status = "extrahiert" if b.betrag_brutto is not None else "neu"
    db.commit()
    return {"ok": True}


@router.get("/orgs/{org_id}/belege/{beleg_id}/datei")
def beleg_datei(
    org_id: int, beleg_id: int,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> Response:
    d = db.scalar(select(BelegDatei).where(
        BelegDatei.org_id == org_id, BelegDatei.beleg_id == beleg_id))
    if d is None:
        raise HTTPException(404, "Keine Datei zu diesem Beleg")
    return Response(content=d.inhalt, media_type=d.mime,
                    headers={"Content-Disposition":
                             f'inline; filename="{d.dateiname}"'})


@router.get("/orgs/{org_id}/belege")
def belege_liste(
    org_id: int, status: str | None = None,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    q = select(Beleg).where(Beleg.org_id == org_id)
    if status:
        q = q.where(Beleg.status == status)
    out = []
    for b in db.scalars(q.order_by(Beleg.id.desc()).limit(200)):
        eintrag = {
            "id": b.id, "quelle": b.quelle, "art": b.art,
            "lieferant": b.lieferant, "datei_name": b.datei_name,
            "rechnungs_nr": b.rechnungs_nr,
            "datum": b.rechnungs_datum.isoformat() if b.rechnungs_datum else None,
            "betrag_brutto":
                str(b.betrag_brutto) if b.betrag_brutto is not None else None,
            "konto_vorschlag": b.konto_vorschlag, "status": b.status,
            "tx": None, "kandidaten": [],
        }
        if b.tx_id:
            t = db.get(BankTransaktion, b.tx_id)
            if t is not None:
                eintrag["tx"] = _tx_dict(t)
        elif b.betrag_brutto is not None:
            eintrag["kandidaten"] = [
                _tx_dict(t) for t in belege_service.kandidaten(
                    db, org_id, b.betrag_brutto, b.rechnungs_datum)
            ]
        out.append(eintrag)
    return out


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
