"""EnableBanking-PSD2-Sync — env-gated (KK_EB_APP_ID + KK_EB_KEY).

Direkt nach dem kontoblick-Muster aus dem FZR-Echtbetrieb gebaut:
JWT-RS256-Auth, Session per Consent-Redirect, Transaktions-Paging über
continuation_key. Ohne konfigurierte Zugangsdaten bleibt alles aus —
die UI zeigt dann den CSV-Weg als Standard.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from datetime import date, datetime, timedelta
from decimal import Decimal

import httpx

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bank import BankKonto, BankTransaktion
from app.models.bankverbindung import BankVerbindung

EB_API = "https://api.enablebanking.com"


def konfiguriert() -> bool:
    return bool(os.environ.get("KK_EB_APP_ID") and os.environ.get("KK_EB_KEY"))


def _jwt() -> str:
    import jwt
    app_id = os.environ["KK_EB_APP_ID"]
    key = os.environ["KK_EB_KEY"].replace("\\n", "\n")
    jetzt = int(time.time())
    return jwt.encode(
        {"iss": "enablebanking.com", "aud": "api.enablebanking.com",
         "iat": jetzt, "exp": jetzt + 3600},
        key, algorithm="RS256", headers={"kid": app_id},
    )


def _headers() -> dict:
    return {"Authorization": f"Bearer {_jwt()}"}


def state_token(org_id: int) -> str:
    geheim = os.environ.get("KK_SECRET", "kontoklar-dev")
    sig = hmac.new(geheim.encode(), str(org_id).encode(), hashlib.sha256).hexdigest()[:16]
    return f"{org_id}.{sig}"


def state_pruefen(state: str) -> int | None:
    try:
        org_s, sig = state.split(".", 1)
        if hmac.compare_digest(state_token(int(org_s)).split(".", 1)[1], sig):
            return int(org_s)
    except Exception:
        pass
    return None


def auth_starten(org_id: int, bank_name: str, bank_land: str = "DE") -> str:
    """Consent-Flow starten → Auth-URL der Bank."""
    r = httpx.post(f"{EB_API}/auth", headers=_headers(), json={
        "access": {"valid_until":
                   (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%S.000Z")},
        "aspsp": {"name": bank_name, "country": bank_land},
        "redirect_url": "https://kontoklar.froehlichdienste.de/app/einstellungen/",
        "state": state_token(org_id),
    }, timeout=30)
    r.raise_for_status()
    return r.json()["url"]


def session_erstellen(db: Session, org_id: int, code: str) -> BankVerbindung:
    r = httpx.post(f"{EB_API}/sessions", headers=_headers(),
                   json={"code": code}, timeout=30)
    r.raise_for_status()
    daten = r.json()
    konto = (daten.get("accounts") or [{}])[0]
    v = db.scalar(select(BankVerbindung).where(BankVerbindung.org_id == org_id))
    if v is None:
        v = BankVerbindung(org_id=org_id)
        db.add(v)
    v.status = "aktiv"
    v.session_id = daten["session_id"]
    v.account_uid = konto.get("uid")
    v.account_iban = (konto.get("account_id") or {}).get("iban")
    v.account_name = (konto.get("bank") or {}).get("name") or "Bankkonto"
    gueltig = daten.get("access", {}).get("valid_until")
    if gueltig:
        v.gueltig_bis = datetime.fromisoformat(gueltig.replace("Z", "+00:00")).replace(tzinfo=None)
    db.flush()
    return v


def _betrag(t: dict) -> Decimal:
    amt = Decimal(str(t["transaction_amount"]["amount"]))
    return amt if t.get("credit_debit_indicator") == "CRDT" else -amt


def sync(db: Session, org_id: int) -> dict:
    """Neue Umsätze holen → BankTransaktion (Dedup über ext_id)."""
    v = db.scalar(select(BankVerbindung).where(BankVerbindung.org_id == org_id))
    if v is None or v.status != "aktiv" or not v.account_uid:
        raise ValueError("Keine aktive Bankverbindung")
    konto = db.scalar(select(BankKonto).where(BankKonto.org_id == org_id))
    if konto is None:
        raise ValueError("Kein Bankkonto angelegt")

    seit = (v.letzter_sync.date() - timedelta(days=7)) if v.letzter_sync else (
        date.today() - timedelta(days=90))
    vorhandene = {
        t.ext_id for t in db.scalars(
            select(BankTransaktion).where(BankTransaktion.org_id == org_id))
    }
    neu = 0
    params: dict = {"date_from": seit.isoformat()}
    while True:
        r = httpx.get(f"{EB_API}/accounts/{v.account_uid}/transactions",
                      headers=_headers(), params=params, timeout=60)
        if r.status_code == 401:
            v.status = "abgelaufen"
            db.commit()
            raise ValueError("Bank-Zugriff abgelaufen — bitte neu verbinden")
        r.raise_for_status()
        daten = r.json()
        for t in daten.get("transactions", []):
            roh = t.get("entry_reference") or ""
            ext = f"eb:{roh}" if roh else "eb:" + hashlib.sha256(
                str(sorted(t.items())).encode()).hexdigest()[:24]
            if ext in vorhandene:
                continue
            vorhandene.add(ext)
            gegen = (t.get("creditor_account") or t.get("debtor_account") or {})
            name = ((t.get("creditor") or {}).get("name")
                    if _betrag(t) < 0 else (t.get("debtor") or {}).get("name")) or ""
            db.add(BankTransaktion(
                org_id=org_id, konto_id=konto.id, ext_id=ext,
                buchungstag=date.fromisoformat(
                    t.get("booking_date") or t.get("value_date")),
                betrag=_betrag(t), name=name[:255],
                zweck=" ".join(t.get("remittance_information") or [])[:500],
                gegen_iban=(gegen.get("iban") or "")[:34] or None,
            ))
            neu += 1
        params["continuation_key"] = daten.get("continuation_key")
        if not params["continuation_key"]:
            break
    v.letzter_sync = datetime.utcnow()
    db.commit()
    return {"neu": neu, "seit": seit.isoformat()}
