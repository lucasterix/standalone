"""Auth: Registrieren, Login, Logout, Ich."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
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


def _neue_session(db: DbSession, user: User, user_agent: str | None,
                  response: Response) -> str:
    token, thash = new_session_token()
    db.add(Session(
        user_id=user.id, token_hash=thash,
        expires_at=datetime.utcnow() + timedelta(days=_SESSION_TAGE),
        user_agent=(user_agent or "")[:200] or None,
    ))
    db.commit()
    # httpOnly-Cookie fuer den Browser (same-origin unter /); das Token wird
    # ZUSAETZLICH zurueckgegeben fuer API-Clients (Bearer) — beide Wege gelten.
    response.set_cookie(
        "kk_session", token, max_age=_SESSION_TAGE * 86400,
        httponly=True, secure=True, samesite="lax", path="/",
    )
    return token


@router.post("/registrieren")
def registrieren(
    body: RegistrierenIn,
    response: Response,
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
    token = _neue_session(db, user, user_agent, response)
    return {"token": token, "user_id": user.id, "org_id": org_id}


@router.post("/login")
def login(
    body: LoginIn,
    response: Response,
    user_agent: str | None = Header(default=None, alias="User-Agent"),
    db: DbSession = Depends(get_db),
) -> dict:
    _rate_limit(f"login:{body.email.lower()}")
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.passwort, user.password_hash):
        # Bewusst EINE Fehlermeldung für beide Fälle (kein User-Enumeration).
        _fehlversuch(f"login:{body.email.lower()}")
        raise HTTPException(401, "E-Mail oder Passwort falsch.")
    if not user.aktiv:
        raise HTTPException(401, "Konto deaktiviert.")
    audit.log(db, org_id=None, user_id=user.id, aktion="auth.login")
    token = _neue_session(db, user, user_agent, response)
    orgs = [
        {"org_id": m.org_id, "rolle": m.rolle,
         "name": db.get(Org, m.org_id).name, "art": db.get(Org, m.org_id).art}
        for m in db.scalars(select(OrgMember).where(OrgMember.user_id == user.id))
    ]
    return {"token": token, "user_id": user.id, "name": user.name, "orgs": orgs}


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    authorization: str = Header(default=""),
    db: DbSession = Depends(get_db),
) -> dict:
    token = None
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    elif request.cookies.get("kk_session"):
        token = request.cookies["kk_session"]
    if token:
        db.execute(delete(Session).where(Session.token_hash == token_hash(token)))
        db.commit()
    response.delete_cookie("kk_session", path="/")
    return {"ok": True}


@router.get("/ich")
def ich(user: User = Depends(current_user), db: DbSession = Depends(get_db)) -> dict:
    orgs = [
        {"org_id": m.org_id, "rolle": m.rolle,
         "name": db.get(Org, m.org_id).name, "art": db.get(Org, m.org_id).art}
        for m in db.scalars(select(OrgMember).where(OrgMember.user_id == user.id))
    ]
    return {"user_id": user.id, "email": user.email, "name": user.name, "orgs": orgs}


# --------------------------------------------------------------------------- #
# Härtung: Rate-Limit, Passwort ändern, Passwort-Reset (SMTP-gated)
# --------------------------------------------------------------------------- #
import os
import smtplib
import threading
import time
from email.mime.text import MIMEText

from app.core.auth import current_user
from app.models.auth import PasswortReset

_limiter_lock = threading.Lock()
_versuche: dict[str, list[float]] = {}
_LIMIT_N, _LIMIT_FENSTER = 10, 900  # 10 Fehlversuche / 15 min


def _rate_limit(schluessel: str) -> None:
    jetzt = time.time()
    with _limiter_lock:
        liste = [t for t in _versuche.get(schluessel, []) if jetzt - t < _LIMIT_FENSTER]
        if len(liste) >= _LIMIT_N:
            _versuche[schluessel] = liste
            raise HTTPException(
                429, "Zu viele Fehlversuche — bitte 15 Minuten warten.")
        _versuche[schluessel] = liste


def _fehlversuch(schluessel: str) -> None:
    with _limiter_lock:
        _versuche.setdefault(schluessel, []).append(time.time())


class PasswortAendernIn(BaseModel):
    aktuelles: str
    neues: str


@router.post("/passwort-aendern")
def passwort_aendern(
    body: PasswortAendernIn,
    user=Depends(current_user), db: DbSession = Depends(get_db),
) -> dict:
    if not verify_password(body.aktuelles, user.password_hash):
        raise HTTPException(403, "Aktuelles Passwort stimmt nicht")
    if len(body.neues) < 10:
        raise HTTPException(400, "Neues Passwort: mindestens 10 Zeichen")
    user.password_hash = hash_password(body.neues)
    # Alle anderen Sitzungen beenden (Passwortwechsel = Sicherheitsereignis).
    db.execute(delete(Session).where(Session.user_id == user.id))
    db.commit()
    return {"ok": True, "hinweis": "Bitte neu anmelden."}


class VergessenIn(BaseModel):
    email: EmailStr


@router.post("/passwort-vergessen")
def passwort_vergessen(body: VergessenIn, db: DbSession = Depends(get_db)) -> dict:
    """Antwort ist IMMER gleich (keine User-Enumeration). Versand nur mit
    konfiguriertem SMTP (KK_SMTP_HOST/USER/PASS) — sonst landet der Token
    im Server-Log für den Admin-Weg."""
    _rate_limit(f"reset:{body.email.lower()}")
    _fehlversuch(f"reset:{body.email.lower()}")
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is not None:
        token, thash = new_session_token()
        db.add(PasswortReset(
            user_id=user.id, token_hash=thash,
            expires_at=datetime.utcnow() + timedelta(hours=2),
        ))
        db.commit()
        link = f"https://kontoklar.froehlichdienste.de/passwort-reset/?t={token}"
        host = os.environ.get("KK_SMTP_HOST")
        if host:
            try:
                msg = MIMEText(
                    "Guten Tag,\n\nüber diesen Link setzen Sie Ihr "
                    f"Kontoklar-Passwort zurück (2 Stunden gültig):\n{link}\n\n"
                    "Falls Sie das nicht angefordert haben, ignorieren Sie "
                    "diese Mail.", _charset="utf-8")
                msg["Subject"] = "Kontoklar — Passwort zurücksetzen"
                msg["From"] = os.environ.get("KK_SMTP_FROM", "kontoklar@froehlichdienste.de")
                msg["To"] = user.email
                with smtplib.SMTP(host, int(os.environ.get("KK_SMTP_PORT", "587"))) as s:
                    s.starttls()
                    s.login(os.environ["KK_SMTP_USER"], os.environ["KK_SMTP_PASS"])
                    s.send_message(msg)
            except Exception:
                print(f"[reset] SMTP-Versand fehlgeschlagen, Link: {link}")
        else:
            print(f"[reset] Kein SMTP konfiguriert. Reset-Link für {user.email}: {link}")
    return {"ok": True,
            "hinweis": "Falls die Adresse existiert, ist eine Mail unterwegs."}


class ResetIn(BaseModel):
    token: str
    neues: str


@router.post("/passwort-reset")
def passwort_reset(body: ResetIn, db: DbSession = Depends(get_db)) -> dict:
    if len(body.neues) < 10:
        raise HTTPException(400, "Neues Passwort: mindestens 10 Zeichen")
    pr = db.scalar(select(PasswortReset).where(
        PasswortReset.token_hash == token_hash(body.token)))
    if pr is None or pr.verwendet or pr.expires_at < datetime.utcnow():
        raise HTTPException(400, "Link ungültig oder abgelaufen")
    user = db.get(User, pr.user_id)
    user.password_hash = hash_password(body.neues)
    pr.verwendet = True
    db.execute(delete(Session).where(Session.user_id == user.id))
    db.commit()
    return {"ok": True}
