"""Echtes Auth: Session-Bearer → User; Org-Zugriff über Mitgliedschaft ODER
Kanzlei-Mandat.

Rollen-Modell (PRODUKT.md § 1a):
* Mitglied der Org (inhaber|buchhaltung) → voller Fachzugriff.
* Mitglied einer KANZLEI-Org mit aktivem Mandat auf die Ziel-Org → Zugriff
  als Rolle „kanzlei" (lesen, Rückfragen, Stapel; Schreib-Einschränkungen
  setzen die Endpoints durch).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.security import token_hash
from app.db import get_db
from app.models.auth import Session
from app.models.org import KanzleiMandat, Org, OrgMember, User


def current_user(
    authorization: str = Header(default=""),
    db: DbSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Nicht angemeldet")
    sess = db.scalar(
        select(Session).where(Session.token_hash == token_hash(authorization[7:]))
    )
    if sess is None or sess.expires_at < datetime.utcnow():
        raise HTTPException(401, "Sitzung abgelaufen — bitte neu anmelden")
    user = db.get(User, sess.user_id)
    if user is None or not user.aktiv:
        raise HTTPException(401, "Konto deaktiviert")
    return user


@dataclass
class OrgZugriff:
    org: Org
    user: User
    rolle: str  # inhaber | buchhaltung | kanzlei


def org_zugriff(org_id: int, user: User, db: DbSession) -> OrgZugriff:
    org = db.get(Org, org_id)
    if org is None:
        raise HTTPException(404, "Org nicht gefunden")
    member = db.scalar(
        select(OrgMember).where(
            OrgMember.org_id == org_id, OrgMember.user_id == user.id
        )
    )
    if member is not None:
        return OrgZugriff(org=org, user=user, rolle=member.rolle)
    # Kanzlei-Weg: User ist Mitglied einer Kanzlei mit aktivem Mandat.
    kanzlei_orgs = [
        m.org_id for m in db.scalars(
            select(OrgMember).where(OrgMember.user_id == user.id)
        )
    ]
    if kanzlei_orgs:
        mandat = db.scalar(
            select(KanzleiMandat).where(
                KanzleiMandat.unternehmen_org_id == org_id,
                KanzleiMandat.kanzlei_org_id.in_(kanzlei_orgs),
                KanzleiMandat.aktiv.is_(True),
                KanzleiMandat.status == "aktiv",
            )
        )
        if mandat is not None:
            return OrgZugriff(org=org, user=user, rolle="kanzlei")
    raise HTTPException(403, "Kein Zugriff auf diese Organisation")


def require_org(
    org_id: int,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_db),
) -> OrgZugriff:
    """FastAPI-Dependency für alle /orgs/{org_id}/…-Routen."""
    return org_zugriff(org_id, user, db)
