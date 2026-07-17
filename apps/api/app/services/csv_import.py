"""Bank-CSV-Import (P0-Weg; PSD2-Aggregator folgt in P1).

Robust gegen die üblichen Bank-Exports (Sparkasse/VR/DKB…): Trennzeichen-
Erkennung, deutsche Beträge („1.234,56"), flexible Spaltennamen. Dedup über
deterministischen Hash (Datum|Betrag|Name|Zweck|Laufindex je Tag) — Reimporte
derselben Datei erzeugen NIE Dubletten (FZR-Invariante).
"""
from __future__ import annotations

import csv
import hashlib
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bank import BankKonto, BankTransaktion

_DATUM_SPALTEN = ("buchungstag", "buchungsdatum", "datum", "valutadatum", "wertstellung")
_BETRAG_SPALTEN = ("betrag", "umsatz", "betrag (eur)", "umsatz (eur)")
_NAME_SPALTEN = ("beguenstigter/zahlungspflichtiger", "name zahlungsbeteiligter",
                 "auftraggeber/empfaenger", "empfaenger", "name", "beguenstigter")
_ZWECK_SPALTEN = ("verwendungszweck", "zweck", "buchungstext", "vorgang/verwendungszweck")
_IBAN_SPALTEN = ("iban zahlungsbeteiligter", "kontonummer/iban", "iban", "kontonummer")


def _find(spalten: dict[str, str], kandidaten: tuple[str, ...]) -> str | None:
    for k in kandidaten:
        if k in spalten:
            return spalten[k]
    return None


def _datum(s: str) -> date | None:
    s = (s or "").strip()
    for fmt in ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _betrag(s: str) -> Decimal | None:
    s = (s or "").strip().replace(" ", "").replace(" ", "")
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def import_csv(db: Session, org_id: int, konto: BankKonto, text: str) -> dict:
    sample = text[:2048]
    delim = ";" if sample.count(";") >= sample.count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delim)
    spalten = { (f or "").strip().lower(): f for f in (reader.fieldnames or []) }

    c_datum = _find(spalten, _DATUM_SPALTEN)
    c_betrag = _find(spalten, _BETRAG_SPALTEN)
    c_name = _find(spalten, _NAME_SPALTEN)
    c_zweck = _find(spalten, _ZWECK_SPALTEN)
    c_iban = _find(spalten, _IBAN_SPALTEN)
    if not c_datum or not c_betrag:
        raise ValueError(
            f"CSV-Spalten nicht erkannt (Datum/Betrag). Gefunden: {list(spalten)[:10]}"
        )

    vorhanden = set(
        db.scalars(
            select(BankTransaktion.ext_id).where(BankTransaktion.org_id == org_id)
        )
    )
    tages_index: dict[str, int] = {}
    neu = fehler = uebersprungen = 0
    for row in reader:
        d = _datum(row.get(c_datum, ""))
        b = _betrag(row.get(c_betrag, ""))
        if d is None or b is None:
            fehler += 1
            continue
        name = (row.get(c_name, "") or "").strip() if c_name else ""
        zweck = (row.get(c_zweck, "") or "").strip() if c_zweck else ""
        iban = (row.get(c_iban, "") or "").replace(" ", "").upper() if c_iban else ""
        if iban and not re.match(r"^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$", iban):
            iban = ""

        basis = f"{d.isoformat()}|{b}|{name}|{zweck}"
        idx = tages_index.get(basis, 0)
        tages_index[basis] = idx + 1
        ext_id = hashlib.sha256(f"{basis}|{idx}".encode()).hexdigest()[:32]
        if ext_id in vorhanden:
            uebersprungen += 1
            continue
        vorhanden.add(ext_id)
        db.add(BankTransaktion(
            org_id=org_id, konto_id=konto.id, buchungstag=d, betrag=b,
            name=name[:255], zweck=zweck[:500], gegen_iban=iban or None,
            ext_id=ext_id,
        ))
        neu += 1
    db.commit()
    return {"neu": neu, "uebersprungen": uebersprungen, "fehler": fehler}
