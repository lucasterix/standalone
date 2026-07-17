"""EXTF-Export: DATEV-Format-Buchungsstapel als Datei (Stufe-1-DATEV-Weg).

Jede Kanzlei kann diese Datei in DATEV Rechnungswesen importieren — ganz ohne
API-Partnerschaft (die kommt als Stufe 2 über den Buchungsdatenservice).

Format: DATEV-ASCII „EXTF", Version 700, Kategorie 21 (Buchungsstapel).
* Kopfzeile 1: Metadaten (Berater/Mandant, WJ-Beginn, Sachkontenlänge,
  Zeitraum, Bezeichnung, Festschreibung=0 → Kanzlei behält das letzte Wort).
* Kopfzeile 2: Spaltennamen; wir befüllen die Kernfelder (Umsatz, S/H, Konto,
  Gegenkonto, BU, Belegdatum TTMM, Belegfeld 1, Buchungstext), Rest leer.
* Zahlen mit Komma, Texte in Anführungszeichen, CRLF, Latin-1 (ANSI).
* S/H-Konvention: Konto = SOLL-Konto des Journals ⇒ Kennzeichen immer „S".
* Sachkontenlänge 4 (Kurzform) ⇒ Personenkonten 5-stellig sind nativ gültig —
  die „technische Länge" (8/9-stellig) ist eine API-Eigenheit, hier unnötig.

⚠ Vor dem ersten Pilotkunden: Datei einmal mit einer echten Kanzlei
  testimportieren (Feld-Reihenfolge/Encoding gegen deren RW-Version).

FZR-Invariante übernommen: Der Stapel friert ``journal_ids`` ein — exportiert
wird exakt dieser Bestand; Status-Kette erstellt → exportiert → uebernommen
(erst „uebernommen" setzt die Journale auf ``gebucht``).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fibu import DatevStapel, Journal
from app.models.org import Org
from app.services.chart_profile import get_profile

# Belegfelder: nur DATEV-erlaubte Zeichen (FZR-Lektion REW01154).
_BELEG_UML = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae",
                            "Ö": "Oe", "Ü": "Ue", "ß": "ss"})
_BELEG_BAD = re.compile(r"[^0-9A-Za-z$%&*+/-]+")

_SPALTEN = [
    "Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz",
    "Kurs", "Basis-Umsatz", "WKZ Basis-Umsatz", "Konto",
    "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum",
    "Belegfeld 1", "Belegfeld 2", "Skonto", "Buchungstext",
    "Postensperre", "Diverse Adressnummer", "Geschäftspartnerbank",
    "Sachverhalt", "Zinssperre", "Beleglink",
]


def _belegfeld(v: str | None, maxlen: int) -> str:
    if not v:
        return ""
    s = _BELEG_BAD.sub("-", v.translate(_BELEG_UML)).strip("-")
    return re.sub(r"-{2,}", "-", s)[:maxlen].strip("-")


def _betrag(d: Decimal) -> str:
    return f"{d:.2f}".replace(".", ",")


def build_stapel(db: Session, org_id: int, von: date, bis: date) -> DatevStapel:
    """Friert die bestätigten Buchungen des Zeitraums als Stapel ein.
    Ein Stapel = eine Periode (Monat) — DATEV-Regel aus dem FZR-Betrieb."""
    if (von.year, von.month) != (bis.year, bis.month):
        raise ValueError("Ein DATEV-Buchungsstapel umfasst genau eine Periode (Monat).")
    rows = db.scalars(
        select(Journal).where(
            Journal.org_id == org_id, Journal.status == "bestaetigt",
            Journal.beleg_datum >= von, Journal.beleg_datum <= bis,
        ).order_by(Journal.beleg_datum, Journal.id)
    ).all()
    if not rows:
        raise ValueError("Keine bestätigten Buchungen im Zeitraum.")
    for j in rows:
        if (j.betrag or 0) <= 0:
            raise ValueError(f"Buchung {j.id}: Betrag 0 — bitte korrigieren.")
    # Perioden-Supersede: nicht übernommene Stapel derselben Periode ersetzen.
    for alt in db.scalars(
        select(DatevStapel).where(
            DatevStapel.org_id == org_id, DatevStapel.von == von,
            DatevStapel.bis == bis, DatevStapel.status != "uebernommen",
        )
    ):
        db.delete(alt)
    stapel = DatevStapel(
        org_id=org_id, von=von, bis=bis, jahr=von.year,
        status="erstellt", saetze=len(rows), journal_ids=[j.id for j in rows],
    )
    db.add(stapel)
    db.commit()
    db.refresh(stapel)
    return stapel


def extf_bytes(db: Session, stapel: DatevStapel) -> tuple[str, bytes]:
    """Erzeugt die EXTF-Datei für einen Stapel. Markiert ihn ``exportiert``."""
    org = db.get(Org, stapel.org_id)
    prof = get_profile(org.chart if org else None)
    rows = db.scalars(
        select(Journal).where(Journal.id.in_(stapel.journal_ids))
        .order_by(Journal.beleg_datum, Journal.id)
    ).all()

    erzeugt = datetime.utcnow().strftime("%Y%m%d%H%M%S000")
    wj_beginn = f"{stapel.jahr}0101"
    bezeichnung = f"{(org.name if org else 'Kontoklar')[:24]} {stapel.von:%Y-%m}"

    kopf1 = [
        '"EXTF"', "700", "21", '"Buchungsstapel"', "12", erzeugt,
        "", '""', '""', '""',
        (org.datev_berater_nr or "") if org else "",
        (org.datev_mandant_nr or "") if org else "",
        wj_beginn, str(prof.sachkonto_laenge),
        f"{stapel.von:%Y%m%d}", f"{stapel.bis:%Y%m%d}",
        f'"{bezeichnung}"', '""',
        "1",  # Buchungstyp: Finanzbuchführung
        "0",  # Rechnungslegungszweck: unabhängig
        "0",  # Festschreibung: NEIN — die Kanzlei behält das letzte Wort
        '"EUR"',
    ]

    zeilen = [";".join(kopf1)]
    zeilen.append(";".join(f'"{s}"' for s in _SPALTEN))
    for j in rows:
        felder = [
            _betrag(Decimal(j.betrag)),          # Umsatz
            '"S"',                                # Konto = Sollkonto ⇒ immer S
            '"EUR"', "", "", "",
            j.soll,                               # Konto
            j.haben,                              # Gegenkonto
            f'"{j.bu}"' if j.bu is not None else '""',
            f"{j.beleg_datum:%d%m}",              # Belegdatum TTMM
            f'"{_belegfeld(j.beleg_nr, 36)}"',
            '""', "",
            f'"{(j.text or "")[:60]}"',
            "", "", "", "", "", "",
        ]
        zeilen.append(";".join(felder))

    inhalt = ("\r\n".join(zeilen) + "\r\n").encode("latin-1", errors="replace")
    stapel.status = "exportiert"
    db.commit()
    name = f"EXTF_Buchungsstapel_{stapel.von:%Y-%m}.csv"
    return name, inhalt


def markiere_uebernommen(db: Session, stapel: DatevStapel) -> int:
    """Kanzlei hat importiert → exakt die eingefrorenen Journale ⇒ ``gebucht``."""
    rows = db.scalars(
        select(Journal).where(
            Journal.id.in_(stapel.journal_ids), Journal.status == "bestaetigt"
        )
    ).all()
    for j in rows:
        j.status = "gebucht"
    stapel.status = "uebernommen"
    db.commit()
    return len(rows)
