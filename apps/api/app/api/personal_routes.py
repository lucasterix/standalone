"""Personal-Onboarding: Org verwaltet Links, Mitarbeitende füllen öffentlich aus.

Feld-Whitelist lebt HIER (eine Wahrheit): Der Server nimmt nur bekannte
Felder an — was das Frontend auch immer schickt. Sensible Angaben
(SV-Nummer, Konfession, Schwerbehinderung) gibt es nur in der
Lang-Variante; gespeichert wird als JSON am Vorgang.
"""
from __future__ import annotations

import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import OrgZugriff, require_org
from app.db import get_db
from app.models.org import Org
from app.models.personal import PersonalEinladung
from app.services import audit

router = APIRouter(tags=["personal"])

# Reihenfolge = Anzeige-Reihenfolge im Formular (Frontend spiegelt sie).
FELDER_KURZ: tuple[str, ...] = (
    "vorname", "nachname", "geburtsdatum", "strasse", "plz", "ort",
    "telefon", "email", "eintrittsdatum", "iban", "steuer_id",
    "krankenkasse", "sv_nummer",
)
FELDER_LANG: tuple[str, ...] = FELDER_KURZ + (
    "geburtsname", "geburtsort", "staatsangehoerigkeit", "familienstand",
    "kinder_anzahl", "kinderfreibetraege", "konfession",
    "hoechster_schulabschluss", "berufsausbildung", "schwerbehinderung",
    "weitere_beschaeftigung", "minijob", "rentenversicherung_befreiung",
    "fuehrerschein", "qualifikation", "notfall_name", "notfall_telefon",
)

_PFLICHT = ("vorname", "nachname")


def _einladung_dict(e: PersonalEinladung, mit_daten: bool = False) -> dict:
    out = {
        "id": e.id, "token": e.token, "variante": e.variante,
        "notiz": e.notiz, "status": e.status,
        "mitarbeiter_name": e.mitarbeiter_name,
        "created_at": e.created_at.isoformat(),
        "ausgefuellt_am": e.ausgefuellt_am.isoformat() if e.ausgefuellt_am else None,
    }
    if mit_daten:
        out["daten"] = e.daten
    return out


# --------------------------------------------------------------------------- #
# Org-Seite (angemeldet)
# --------------------------------------------------------------------------- #
class EinladungIn(BaseModel):
    variante: str = "kurz"
    notiz: str | None = None


@router.post("/orgs/{org_id}/personal/einladungen")
def einladung_erstellen(
    org_id: int, body: EinladungIn,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Einladungen erstellt nur das Unternehmen")
    if body.variante not in ("kurz", "lang"):
        raise HTTPException(400, "variante: kurz oder lang")
    e = PersonalEinladung(
        org_id=org_id, token=secrets.token_urlsafe(24),
        variante=body.variante, notiz=(body.notiz or "").strip()[:120] or None,
    )
    db.add(e)
    db.flush()
    audit.log(db, org_id=org_id, user_id=z.user.id,
              aktion="personal.einladung", details={"variante": body.variante})
    db.commit()
    return _einladung_dict(e)


@router.get("/orgs/{org_id}/personal/einladungen")
def einladungen_liste(
    org_id: int, z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> list[dict]:
    return [
        _einladung_dict(e, mit_daten=True)
        for e in db.scalars(
            select(PersonalEinladung)
            .where(PersonalEinladung.org_id == org_id)
            .order_by(PersonalEinladung.id.desc())
        )
    ]


@router.post("/orgs/{org_id}/personal/einladungen/{eid}/zurueckziehen")
def einladung_zurueckziehen(
    org_id: int, eid: int,
    z: OrgZugriff = Depends(require_org), db: DbSession = Depends(get_db),
) -> dict:
    if z.rolle == "kanzlei":
        raise HTTPException(403, "Nur das Unternehmen")
    e = db.get(PersonalEinladung, eid)
    if e is None or e.org_id != org_id:
        raise HTTPException(404, "Einladung nicht gefunden")
    if e.status == "ausgefuellt":
        raise HTTPException(409, "Schon ausgefüllt — nicht mehr zurückziehbar")
    e.status = "zurueckgezogen"
    db.commit()
    return _einladung_dict(e)


# --------------------------------------------------------------------------- #
# Öffentlich (Whitelabel, ohne Login) — nur über den Token erreichbar.
# --------------------------------------------------------------------------- #
@router.get("/personal/formular/{token}")
def formular_lesen(token: str, db: DbSession = Depends(get_db)) -> dict:
    e = db.scalar(select(PersonalEinladung).where(PersonalEinladung.token == token))
    if e is None or e.status == "zurueckgezogen":
        raise HTTPException(404, "Dieser Link ist nicht (mehr) gültig")
    org = db.get(Org, e.org_id)
    return {
        "firma": org.name if org else "",
        "variante": e.variante,
        "status": e.status,
        "felder": list(FELDER_LANG if e.variante == "lang" else FELDER_KURZ),
    }


class FormularIn(BaseModel):
    daten: dict


@router.post("/personal/formular/{token}")
def formular_absenden(
    token: str, body: FormularIn, db: DbSession = Depends(get_db),
) -> dict:
    e = db.scalar(select(PersonalEinladung).where(PersonalEinladung.token == token))
    if e is None or e.status == "zurueckgezogen":
        raise HTTPException(404, "Dieser Link ist nicht (mehr) gültig")
    if e.status == "ausgefuellt":
        raise HTTPException(409, "Dieses Formular wurde bereits abgesendet")
    erlaubt = FELDER_LANG if e.variante == "lang" else FELDER_KURZ
    daten = {
        k: str(v).strip()[:300]
        for k, v in (body.daten or {}).items()
        if k in erlaubt and str(v).strip()
    }
    fehlend = [f for f in _PFLICHT if not daten.get(f)]
    if fehlend:
        raise HTTPException(400, f"Bitte ausfüllen: {', '.join(fehlend)}")
    e.daten = daten
    e.mitarbeiter_name = f"{daten['vorname']} {daten['nachname']}"
    e.status = "ausgefuellt"
    e.ausgefuellt_am = datetime.utcnow()
    audit.log(db, org_id=e.org_id, user_id=None,
              aktion="personal.ausgefuellt",
              details={"einladung": e.id, "felder": len(daten)})
    db.commit()
    return {"ok": True, "firma_dank": True}
