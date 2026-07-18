"""Routen: Klärungs-Assistent + Verkauf (Angebote/Rechnungen/E-Rechnung)."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import OrgZugriff, require_org
from app.db import get_db
from app.models.bank import BankKonto
from app.models.fibu import OposPosten
from app.models.verkauf import VerkaufDokument
from app.services import assistent, audit, verkauf

router = APIRouter(tags=["verkauf"])


# --------------------------------------------------------------------------- #
# Klärungs-Assistent
# --------------------------------------------------------------------------- #
@router.get("/orgs/{org_id}/assistent/fragen")
def assistent_fragen(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    return assistent.fragen(db, org_id)


class AntwortIn(BaseModel):
    typ: str
    partner_key: str
    journal_ids: list[int]
    konto: str | None = None
    ist_patient: bool = False


@router.post("/orgs/{org_id}/assistent/antwort")
def assistent_antwort(
    org_id: int, body: AntwortIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Antworten gibt nur das Unternehmen")
    try:
        res = assistent.antworten(
            db, org_id, typ=body.typ, partner_key=body.partner_key,
            journal_ids=body.journal_ids, konto=body.konto,
            ist_patient=body.ist_patient,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="assistent.antwort",
              details={"typ": body.typ, **res})
    db.commit()
    return res


# --------------------------------------------------------------------------- #
# Verkauf: Angebote + Rechnungen
# --------------------------------------------------------------------------- #
class PositionIn(BaseModel):
    bezeichnung: str
    menge: float = 1
    einheit: str | None = None
    einzelpreis: float
    ust_satz: float = 0


class DokumentIn(BaseModel):
    art: str  # angebot|rechnung
    kunde_name: str
    kunde_adresse: str | None = None
    kunde_email: str | None = None
    leitweg_id: str | None = None
    faellig_tage: int = 14
    positionen: list[PositionIn]
    angebot_id: int | None = None


def _dok_dict(d: VerkaufDokument) -> dict:
    return {
        "id": d.id, "art": d.art, "nummer": d.nummer, "status": d.status,
        "kunde_name": d.kunde_name, "kunde_adresse": d.kunde_adresse,
        "kunde_email": d.kunde_email, "leitweg_id": d.leitweg_id,
        "datum": d.datum.isoformat(),
        "faellig_am": d.faellig_am.isoformat() if d.faellig_am else None,
        "positionen": d.positionen,
        "summe_netto": str(d.summe_netto), "summe_ust": str(d.summe_ust),
        "summe_brutto": str(d.summe_brutto), "angebot_id": d.angebot_id,
    }


@router.get("/orgs/{org_id}/verkauf")
def verkauf_liste(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    return [
        _dok_dict(d) for d in db.scalars(
            select(VerkaufDokument)
            .where(VerkaufDokument.org_id == org_id)
            .order_by(VerkaufDokument.id.desc())
        )
    ]


@router.post("/orgs/{org_id}/verkauf")
def verkauf_anlegen(
    org_id: int, body: DokumentIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Dokumente erstellt nur das Unternehmen")
    if body.art not in ("angebot", "rechnung"):
        raise HTTPException(400, "art: angebot oder rechnung")
    if not body.positionen:
        raise HTTPException(400, "Mindestens eine Position")
    heute = date.today()
    positionen = [p.model_dump() for p in body.positionen]
    netto, ust, brutto = verkauf.summen(positionen)
    from datetime import timedelta
    dok = VerkaufDokument(
        org_id=org_id, art=body.art,
        nummer=verkauf.naechste_nummer(db, org_id, body.art, heute.year),
        kunde_name=body.kunde_name.strip(),
        kunde_adresse=body.kunde_adresse, kunde_email=body.kunde_email,
        leitweg_id=body.leitweg_id, datum=heute,
        faellig_am=heute + timedelta(days=body.faellig_tage)
        if body.art == "rechnung" else None,
        positionen=positionen,
        summe_netto=netto, summe_ust=ust, summe_brutto=brutto,
        status="entwurf" if body.art == "angebot" else "offen",
        angebot_id=body.angebot_id,
    )
    db.add(dok)
    db.flush()
    if body.art == "rechnung":
        verkauf.rechnung_stellen(db, dok)
        if body.angebot_id:
            ang = db.get(VerkaufDokument, body.angebot_id)
            if ang and ang.org_id == org_id and ang.art == "angebot":
                ang.status = "angenommen"
    audit.log(db, org_id=org_id, user_id=z.user.id,
              aktion=f"verkauf.{body.art}_erstellt",
              details={"nummer": dok.nummer, "brutto": str(brutto)})
    db.commit()
    return _dok_dict(dok)


class StatusIn(BaseModel):
    status: str


@router.patch("/orgs/{org_id}/verkauf/{dok_id}/status")
def verkauf_status_org(
    org_id: int, dok_id: int, body: StatusIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Status ändert nur das Unternehmen")
    dok = db.get(VerkaufDokument, dok_id)
    if dok is None or dok.org_id != org_id:
        raise HTTPException(404, "Dokument nicht gefunden")
    erlaubt = {
        "angebot": ("entwurf", "versendet", "angenommen", "abgelehnt"),
        "rechnung": ("offen", "bezahlt", "storniert"),
    }[dok.art]
    if body.status not in erlaubt:
        raise HTTPException(400, f"Status für {dok.art}: {', '.join(erlaubt)}")
    dok.status = body.status
    # Rechnung bezahlt/storniert → offenen Posten mitführen.
    if dok.opos_id:
        posten = db.get(OposPosten, dok.opos_id)
        if posten is not None:
            if body.status == "bezahlt":
                posten.status = "bezahlt"
            elif body.status == "storniert":
                posten.status = "storniert"
            else:
                posten.status = "offen"
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="verkauf.status",
              details={"nummer": dok.nummer, "status": body.status})
    db.commit()
    return _dok_dict(dok)


@router.get("/orgs/{org_id}/verkauf/{dok_id}/xrechnung")
def verkauf_xrechnung(
    org_id: int, dok_id: int,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> Response:
    dok = db.get(VerkaufDokument, dok_id)
    if dok is None or dok.org_id != org_id:
        raise HTTPException(404, "Dokument nicht gefunden")
    if dok.art != "rechnung":
        raise HTTPException(400, "E-Rechnung gibt es nur für Rechnungen")
    konto = db.scalar(select(BankKonto).where(BankKonto.org_id == org_id))
    xml = verkauf.xrechnung_xml(z.org, dok, verkaeufer_iban=konto.iban if konto else None)
    audit.log(db, org_id=org_id, user_id=z.user.id, aktion="verkauf.xrechnung",
              details={"nummer": dok.nummer})
    db.commit()
    return Response(
        content=xml, media_type="application/xml",
        headers={"Content-Disposition":
                 f'attachment; filename="{dok.nummer}_xrechnung.xml"'},
    )
