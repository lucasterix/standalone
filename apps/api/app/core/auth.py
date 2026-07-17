"""P0-Auth: EIN Dev-Bearer-Token (Platzhalter für echtes Auth in P1).

Die Mandantentrennung hängt NICHT hieran — sie steckt in den org_id-Scopes
jeder Fachoperation. Hier wird nur „darf überhaupt jemand rein" geprüft.
"""
from fastapi import Header, HTTPException

from app.core.settings import settings


def require_token(authorization: str = Header(default="")) -> None:
    if authorization != f"Bearer {settings.dev_api_token}":
        raise HTTPException(401, "Ungültiges oder fehlendes Token")
