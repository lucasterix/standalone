"""KI-Belegleser für Fotos/Scans — env-gated (KK_ANTHROPIC_KEY).

Text-PDFs liest weiterhin pypdf (deterministisch, kostenlos). Nur wenn
dort nichts zu holen ist UND ein API-Key konfiguriert ist, schaut ein
Vision-Modell auf das Bild und liefert Betrag/Datum/Lieferant/Re-Nr.
Fehler führen nie zum Upload-Abbruch — schlimmstenfalls bleibt der
Beleg unerkannt und der Mensch gibt den Betrag an.
"""
from __future__ import annotations

import base64
import json
import os
import re
from datetime import date
from decimal import Decimal, InvalidOperation

import httpx

MODELL = "claude-haiku-4-5-20251001"


def konfiguriert() -> bool:
    return bool(os.environ.get("KK_ANTHROPIC_KEY"))


def lese_bild(inhalt: bytes, mime: str) -> dict:
    if not konfiguriert() or not mime.startswith("image/"):
        return {}
    try:
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": os.environ["KK_ANTHROPIC_KEY"],
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": MODELL,
                "max_tokens": 300,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {
                            "type": "base64", "media_type": mime,
                            "data": base64.b64encode(inhalt).decode()}},
                        {"type": "text", "text":
                         "Das ist ein Beleg/eine Rechnung. Antworte NUR mit "
                         "einem JSON-Objekt: {\"betrag\": \"Brutto-Endbetrag "
                         "als Zahl mit Punkt, z.B. 123.45\", \"datum\": "
                         "\"JJJJ-MM-TT\", \"lieferant\": \"Name\", "
                         "\"rechnungs_nr\": \"...\"}. Unbekannte Felder: null."},
                    ],
                }],
            },
            timeout=45,
        )
        r.raise_for_status()
        text = r.json()["content"][0]["text"]
        m = re.search(r"\{.*\}", text, re.S)
        roh = json.loads(m.group(0)) if m else {}
    except Exception:
        return {}

    out: dict = {}
    if roh.get("betrag"):
        try:
            out["betrag"] = Decimal(str(roh["betrag"]).replace(",", "."))
        except InvalidOperation:
            pass
    if roh.get("datum"):
        try:
            out["datum"] = date.fromisoformat(str(roh["datum"]))
        except ValueError:
            pass
    for feld in ("lieferant", "rechnungs_nr"):
        if roh.get(feld):
            out[feld] = str(roh[feld])[:100]
    return out
