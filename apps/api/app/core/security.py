"""Passwort-Hashing + Session-Tokens — Standardbibliothek, keine Zusatz-Deps.

* Passwörter: scrypt (hashlib), Parameter n=2^14/r=8/p=1, 16-Byte-Salt.
  Format: ``scrypt$<n>$<r>$<p>$<salt_hex>$<hash_hex>`` — Parameter stehen im
  Hash, damit spätere Verschärfungen alte Hashes weiter verifizieren.
* Sessions: 32-Byte-URL-Token an den Client; in der DB liegt NUR der
  SHA-256 des Tokens (DB-Leak ≠ Session-Leak).
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets

_N, _R, _P = 2**14, 8, 1


def hash_password(passwort: str) -> str:
    salt = os.urandom(16)
    h = hashlib.scrypt(passwort.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${salt.hex()}${h.hex()}"


def verify_password(passwort: str, gespeichert: str) -> bool:
    try:
        art, n, r, p, salt_hex, hash_hex = gespeichert.split("$")
        if art != "scrypt":
            return False
        h = hashlib.scrypt(
            passwort.encode(), salt=bytes.fromhex(salt_hex),
            n=int(n), r=int(r), p=int(p), dklen=32,
        )
        return hmac.compare_digest(h.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def new_session_token() -> tuple[str, str]:
    """(klartext_token_fuer_client, sha256_fuer_db)."""
    token = secrets.token_urlsafe(32)
    return token, hashlib.sha256(token.encode()).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
