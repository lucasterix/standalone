"""Auth: Registrieren, Login, Logout, Ich."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from app.core.auth import current_user
from app.core.security import hash_password, new_session_token, token_hash, verify_password
from app.db import get_db
from app.models.auth import Session
from app.models.org import Org, OrgMember, User
from app.services import audit
from app.models.bank import BankKonto
from app.services.chart_profile import get_profile
from app.services.skr_seed import seed_kontenrahmen

router = APIRouter(prefix="/auth", tags=["auth"])

_SESSION_TAGE = 30


class RegistrierenIn(BaseModel):
    email: EmailStr
    name: str
    passwort: str
    # Optional direkt eine Org mitgründen (Onboarding-Weg).
    org_name: str | None = None
    org_art: str = "unternehmen"
    chart: str = "SKR45"


class LoginIn(BaseModel):
    email: EmailStr
    passwort: str


def _neue_session(db: DbSession, user: User, user_agent: str | None) -> str:
    token, thash = new_session_token()
    db.add(Session(
        user_id=user.id, token_hash=thash,
        expires_at=datetime.utcnow() + timedelta(days=_SESSION_TAGE),
        user_agent=(user_agent or "")[:200] or None,
    ))
    db.commit()
    return token


@router.post("/registrieren")
def registrieren(
    body: RegistrierenIn,
    user_agent: str | None = Header(default=None, alias="User-Agent"),
    db: DbSession = Depends(get_db),
) -> dict:
    if len(body.passwort) < 10:
        raise HTTPException(400, "Passwort: mindestens 10 Zeichen.")
    if db.scalar(select(User).where(User.email == body.email.lower())):
        raise HTTPException(409, "E-Mail ist bereits registriert.")
    user = User(email=body.email.lower(), name=body.name.strip(),
                password_hash=hash_password(body.passwort))
    db.add(user)
    db.flush()
    org_id = None
    if body.org_name:
        org = Org(name=body.org_name.strip(), art=body.org_art, chart=body.chart)
        db.add(org)
        db.flush()
        db.add(OrgMember(org_id=org.id, user_id=user.id, rolle="inhaber"))
        if org.art == "unternehmen":
            seed_kontenrahmen(db, org.id, org.chart)
            prof = get_profile(org.chart)
            db.add(BankKonto(org_id=org.id, name="Bank", sachkonto=prof.bank))
        org_id = org.id
    audit.log(db, org_id=org_id, user_id=user.id, aktion="auth.registriert")
    token = _neue_session(db, user, user_agent)
    return {"token": token, "user_id": user.id, "org_id": org_id}


@router.post("/login")
def login(
    body: LoginIn,
    user_agent: str | None = Header(default=None, alias="User-Agent"),
    db: DbSession = Depends(get_db),
) -> dict:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.passwort, user.password_hash):
        # Bewusst EINE Fehlermeldung für beide Fälle (kein User-Enumeration).
        raise HTTPException(401, "E-Mail oder Passwort falsch.")
    if not user.aktiv:
        raise HTTPException(401, "Konto deaktiviert.")
    audit.log(db, org_id=None, user_id=user.id, aktion="auth.login")
    token = _neue_session(db, user, user_agent)
    orgs = [
        {"org_id": m.org_id, "rolle": m.rolle,
         "name": db.get(Org, m.org_id).name, "art": db.get(Org, m.org_id).art}
        for m in db.scalars(select(OrgMember).where(OrgMember.user_id == user.id))
    ]
    return {"token": token, "user_id": user.id, "name": user.name, "orgs": orgs}


@router.post("/logout")
def logout(
    authorization: str = Header(default=""),
    db: DbSession = Depends(get_db),
) -> dict:
    if authorization.startswith("Bearer "):
        db.execute(delete(Session).where(
            Session.token_hash == token_hash(authorization[7:])
        ))
        db.commit()
    return {"ok": True}


@router.get("/ich")
def ich(user: User = Depends(current_user), db: DbSession = Depends(get_db)) -> dict:
    orgs = [
        {"org_id": m.org_id, "rolle": m.rolle,
         "name": db.get(Org, m.org_id).name, "art": db.get(Org, m.org_id).art}
        for m in db.scalars(select(OrgMember).where(OrgMember.user_id == user.id))
    ]
    return {"user_id": user.id, "email": user.email, "name": user.name, "orgs": orgs}
