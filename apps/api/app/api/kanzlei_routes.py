"""Kanzlei: Einladungen, Mandate, Cockpit-Daten (PRODUKT.md § 1)."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import current_user, org_zugriff
from app.core.security import new_session_token, token_hash
from app.db import get_db
from app.models.auth import KanzleiEinladung
from app.models.fach import Rueckfrage
from app.models.fibu import DatevStapel, Journal
from app.models.org import KanzleiMandat, Org, OrgMember, User
from app.services import audit, saldenabgleich

router = APIRouter(prefix="/kanzlei", tags=["kanzlei"])


def _require_kanzlei(org_id: int, user: User, db: DbSession):
    z = org_zugriff(org_id, user, db)
    if z.org.art != "kanzlei":
        raise HTTPException(400, "Diese Org ist keine Kanzlei.")
    return z


class EinladungIn(BaseModel):
    email: EmailStr


@router.post("/{kanzlei_org_id}/einladungen")
def einladung_erstellen(
    kanzlei_org_id: int, body: EinladungIn,
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    _require_kanzlei(kanzlei_org_id, user, db)
    token, thash = new_session_token()
    db.add(KanzleiEinladung(
        kanzlei_org_id=kanzlei_org_id, email=body.email.lower(),
        token_hash=thash, expires_at=datetime.utcnow() + timedelta(days=14),
    ))
    audit.log(db, org_id=kanzlei_org_id, user_id=user.id,
              aktion="kanzlei.einladung", details={"email": body.email})
    db.commit()
    # Der Link wird in P1 per Mail verschickt; P0 gibt ihn zurück.
    return {"einladungs_token": token, "gueltig_tage": 14}


class AnnehmenIn(BaseModel):
    token: str
    unternehmen_org_id: int


@router.post("/einladungen/annehmen")
def einladung_annehmen(
    body: AnnehmenIn,
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    z = org_zugriff(body.unternehmen_org_id, user, db)  # muss Mitglied sein
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Nur das Unternehmen selbst kann annehmen.")
    einladung = db.scalar(
        select(KanzleiEinladung).where(
            KanzleiEinladung.token_hash == token_hash(body.token),
            KanzleiEinladung.status == "offen",
        )
    )
    if einladung is None or einladung.expires_at < datetime.utcnow():
        raise HTTPException(404, "Einladung ungültig oder abgelaufen.")
    if db.scalar(select(KanzleiMandat).where(
        KanzleiMandat.unternehmen_org_id == body.unternehmen_org_id
    )):
        raise HTTPException(409, "Dieses Unternehmen hat bereits eine Kanzlei.")
    db.add(KanzleiMandat(
        kanzlei_org_id=einladung.kanzlei_org_id,
        unternehmen_org_id=body.unternehmen_org_id,
        status="aktiv",
    ))
    einladung.status = "angenommen"
    audit.log(db, org_id=body.unternehmen_org_id, user_id=user.id,
              aktion="kanzlei.mandat_angenommen",
              details={"kanzlei_org_id": einladung.kanzlei_org_id})
    db.commit()
    return {"ok": True, "kanzlei_org_id": einladung.kanzlei_org_id}


@router.get("/{kanzlei_org_id}/cockpit")
def cockpit(
    kanzlei_org_id: int, jahr: int,
    user: User = Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    """Mandanten-Tabelle des Cockpits: je Mandat Cent-Anker, offene Punkte,
    Stapel-Status, offene Rückfragen — sortiert nach Handlungsbedarf."""
    _require_kanzlei(kanzlei_org_id, user, db)
    mandate = db.scalars(
        select(KanzleiMandat).where(
            KanzleiMandat.kanzlei_org_id == kanzlei_org_id,
            KanzleiMandat.aktiv.is_(True),
        )
    ).all()
    zeilen = []
    for m in mandate:
        org = db.get(Org, m.unternehmen_org_id)
        saldo = saldenabgleich.compute(db, m.unternehmen_org_id, jahr)
        letzte = [x for x in saldo["monate"] if x["tx_count"] or x["erfasst_count"]]
        aktueller = letzte[-1] if letzte else None
        offen = db.scalar(
            select(func.count()).select_from(Journal).where(
                Journal.org_id == m.unternehmen_org_id,
                Journal.status == "vorgeschlagen",
            )
        )
        stapel = db.scalar(
            select(DatevStapel).where(DatevStapel.org_id == m.unternehmen_org_id)
            .order_by(DatevStapel.id.desc())
        )
        rueckfragen = db.scalar(
            select(func.count()).select_from(Rueckfrage).where(
                Rueckfrage.org_id == m.unternehmen_org_id,
                Rueckfrage.status == "offen",
            )
        )
        zeilen.append({
            "org_id": m.unternehmen_org_id,
            "name": org.name if org else "?",
            "anker_ok": bool(aktueller["ok"]) if aktueller else None,
            "anker_monat": aktueller["monat"] if aktueller else None,
            "offen": int(offen or 0),
            "stapel_status": stapel.status if stapel else None,
            "stapel_saetze": stapel.saetze if stapel else 0,
            "rueckfragen_offen": int(rueckfragen or 0),
        })
    # Handlungsbedarf zuerst: Anker rot > Stapel erstellt > offene Punkte.
    zeilen.sort(key=lambda z: (
        z["anker_ok"] is not False,
        z["stapel_status"] != "erstellt",
        -z["offen"],
    ))
    return {"jahr": jahr, "mandate": zeilen}
