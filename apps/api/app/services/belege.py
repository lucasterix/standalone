"""Beleg-Upload: Text-Extraktion (PDF) + Matching gegen Banktransaktionen.

Ehrlich statt Zauber: Text-PDFs (E-Rechnungen, digitale Rechnungen)
werden per pypdf gelesen — Betrag/Datum/Rechnungsnummer per Muster.
Fotos/Scans haben (noch) keine OCR: Da hilft der optionale Betrag beim
Upload. Zugeordnet wird nur bei EINEM eindeutigen Kandidaten — sonst
entscheidet der Mensch aus der Kandidatenliste.
"""
from __future__ import annotations

import io
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bank import BankTransaktion
from app.models.fach import Beleg

_BETRAG = re.compile(r"(\d{1,3}(?:\.\d{3})*,\d{2})")
_BETRAG_KONTEXT = re.compile(
    r"(?:gesamt|brutto|summe|zu zahlen|zahlbetrag|rechnungsbetrag|endbetrag)"
    r"[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2})", re.I | re.S)
_DATUM = re.compile(r"\b(\d{2})\.(\d{2})\.(\d{4})\b")
_RE_NR = re.compile(
    r"(?:rechnungs?-?\s?(?:nr\.?|nummer)|invoice\s?(?:no\.?|number)?)"
    r"\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-/_.]{2,30})", re.I)


def _zu_decimal(s: str) -> Decimal | None:
    try:
        return Decimal(s.replace(".", "").replace(",", "."))
    except InvalidOperation:
        return None


def extrahiere(inhalt: bytes, mime: str) -> dict:
    """Betrag/Datum/Rechnungs-Nr. aus Text-PDFs; Bilder → leer."""
    if "pdf" not in mime.lower():
        return {}
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(inhalt))
        text = "\n".join((p.extract_text() or "") for p in reader.pages[:5])
    except Exception:
        return {}
    if not text.strip():
        return {}

    out: dict = {}
    m = _BETRAG_KONTEXT.search(text)
    if m:
        out["betrag"] = _zu_decimal(m.group(1))
    else:
        betraege = [b for b in (_zu_decimal(x) for x in _BETRAG.findall(text)) if b]
        if betraege:
            # Ohne Kontext-Treffer: der größte Betrag ist meist der Brutto-Endbetrag.
            out["betrag"] = max(betraege)
    d = _DATUM.search(text)
    if d:
        try:
            out["datum"] = date(int(d.group(3)), int(d.group(2)), int(d.group(1)))
        except ValueError:
            pass
    r = _RE_NR.search(text)
    if r:
        out["rechnungs_nr"] = r.group(1)
    return {k: v for k, v in out.items() if v is not None}


def kandidaten(db: Session, org_id: int, betrag: Decimal,
               datum: date | None = None, max_n: int = 5) -> list[BankTransaktion]:
    """Unbelegte Transaktionen mit exakt passendem Betrag, nach Datums-Nähe."""
    belegt = {
        b.tx_id for b in db.scalars(
            select(Beleg).where(Beleg.org_id == org_id, Beleg.tx_id.isnot(None))
        )
    }
    txs = [
        t for t in db.scalars(
            select(BankTransaktion).where(BankTransaktion.org_id == org_id)
        )
        if abs(t.betrag) == abs(betrag) and t.id not in belegt
    ]
    anker = datum or date.today()
    txs.sort(key=lambda t: abs((t.buchungstag - anker).days))
    return txs[:max_n]


def zuordnung_versuchen(db: Session, beleg: Beleg) -> list[BankTransaktion]:
    """Auto-Zuordnung NUR bei Eindeutigkeit; sonst Kandidaten zurückgeben."""
    if beleg.betrag_brutto is None:
        return []
    treffer = kandidaten(db, beleg.org_id, beleg.betrag_brutto,
                         beleg.rechnungs_datum)
    if len(treffer) == 1:
        beleg.tx_id = treffer[0].id
        beleg.status = "zugeordnet"
        return treffer
    if len(treffer) > 1 and beleg.rechnungs_datum:
        # Eindeutig nah dran (Rechnung ≤ 21 Tage vor Zahlung, klar näher als Nr. 2)
        d0 = abs((treffer[0].buchungstag - beleg.rechnungs_datum).days)
        d1 = abs((treffer[1].buchungstag - beleg.rechnungs_datum).days)
        if d0 <= 21 and d1 - d0 >= 7:
            beleg.tx_id = treffer[0].id
            beleg.status = "zugeordnet"
    return treffer
