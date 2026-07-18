"""DATEV-freie Exporte: CSV + PDF für Personalbögen und Buchungsjournal.

Für Betriebe ohne DATEV-Kanzlei (oder für die Ablage): dieselben Daten
als Excel-taugliches CSV (Semikolon, UTF-8-BOM) und als druckfertiges
PDF (fpdf2, Core-Fonts → Latin-1; Zeichen außerhalb werden ersetzt).
"""
from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal

from fpdf import FPDF

from app.models.org import Org
from app.models.personal import PersonalEinladung

# Anzeige-Labels (eine Wahrheit fürs PDF/CSV — Reihenfolge = FELDER_LANG).
PERSONAL_LABELS: dict[str, str] = {
    "vorname": "Vorname", "nachname": "Nachname",
    "geburtsdatum": "Geburtsdatum", "strasse": "Straße", "plz": "PLZ",
    "ort": "Ort", "telefon": "Telefon", "email": "E-Mail",
    "eintrittsdatum": "Eintrittsdatum", "iban": "IBAN",
    "steuer_id": "Steuer-ID", "krankenkasse": "Krankenkasse",
    "sv_nummer": "SV-Nummer", "geburtsname": "Geburtsname",
    "geburtsort": "Geburtsort", "staatsangehoerigkeit": "Staatsangehörigkeit",
    "familienstand": "Familienstand", "kinder_anzahl": "Anzahl Kinder",
    "kinderfreibetraege": "Kinderfreibeträge", "konfession": "Konfession",
    "hoechster_schulabschluss": "Höchster Schulabschluss",
    "berufsausbildung": "Berufsausbildung", "schwerbehinderung": "Schwerbehinderung",
    "weitere_beschaeftigung": "Weitere Beschäftigung", "minijob": "Minijob",
    "rentenversicherung_befreiung": "RV-Befreiung (Minijob)",
    "fuehrerschein": "Führerschein", "qualifikation": "Qualifikation",
    "notfall_name": "Notfallkontakt", "notfall_telefon": "Notfall-Telefon",
}


def _csv_bytes(zeilen: list[list[str]]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\r\n")
    w.writerows(zeilen)
    # BOM: Excel öffnet UTF-8 sonst als Latin-1 (Umlaut-Salat).
    return ("﻿" + buf.getvalue()).encode("utf-8")


def _s(text: str | None) -> str:
    """Latin-1-sicher für die PDF-Core-Fonts."""
    return (text or "").encode("latin-1", "replace").decode("latin-1")


class _Pdf(FPDF):
    def __init__(self, firma: str, titel: str):
        super().__init__()
        self.firma = firma
        self.titel = titel
        self.set_auto_page_break(auto=True, margin=18)
        self.add_page()

    def header(self):
        self.set_font("helvetica", "B", 14)
        self.cell(0, 8, _s(self.firma), new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "", 10)
        self.set_text_color(110, 105, 95)
        self.cell(0, 6, _s(self.titel), new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(3)
        self.set_draw_color(210, 205, 195)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("helvetica", "", 8)
        self.set_text_color(150, 145, 135)
        self.cell(0, 6, _s(f"Seite {self.page_no()}"), align="C")


# --------------------------------------------------------------------------- #
# Personal
# --------------------------------------------------------------------------- #
def personal_csv(einladungen: list[PersonalEinladung]) -> bytes:
    felder = list(PERSONAL_LABELS)
    zeilen = [[PERSONAL_LABELS[f] for f in felder] + ["Ausgefüllt am"]]
    for e in einladungen:
        d = e.daten or {}
        zeilen.append(
            [d.get(f, "") for f in felder]
            + [e.ausgefuellt_am.strftime("%d.%m.%Y") if e.ausgefuellt_am else ""]
        )
    return _csv_bytes(zeilen)


def personal_pdf(org: Org, e: PersonalEinladung) -> bytes:
    pdf = _Pdf(org.name, "Personalbogen"
               + (f" · eingegangen am {e.ausgefuellt_am.strftime('%d.%m.%Y')}"
                  if e.ausgefuellt_am else ""))
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 8, _s(e.mitarbeiter_name or ""), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    d = e.daten or {}
    pdf.set_font("helvetica", "", 10)
    for feld, label in PERSONAL_LABELS.items():
        if feld not in d:
            continue
        pdf.set_text_color(110, 105, 95)
        pdf.cell(62, 7, _s(label), border="B")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 7, _s(d[feld]), border="B", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
    pdf.ln(6)
    pdf.set_font("helvetica", "", 8)
    pdf.set_text_color(150, 145, 135)
    pdf.multi_cell(0, 4.5, _s(
        "Vom Mitarbeiter/der Mitarbeiterin selbst über den Onboarding-Link "
        "übermittelt. Nur für Zwecke des Beschäftigungsverhältnisses verwenden."))
    return bytes(pdf.output())


# --------------------------------------------------------------------------- #
# Buchungsjournal
# --------------------------------------------------------------------------- #
_J_KOEPFE = ["Datum", "Soll", "Haben", "BU", "Betrag", "Buchungstext",
             "Partner", "Status", "Herkunft"]


def journal_csv(rows: list[dict]) -> bytes:
    zeilen = [_J_KOEPFE]
    for r in rows:
        zeilen.append([
            r["datum"], r["soll"], r["haben"],
            str(r["bu"] or ""),
            str(r["betrag"]).replace(".", ","),
            r["text"] or "", r["partner"] or "",
            r["status"], r["entschieden_via"] or r["origin"],
        ])
    return _csv_bytes(zeilen)


def journal_pdf(org: Org, rows: list[dict], untertitel: str) -> bytes:
    pdf = _Pdf(org.name, f"Buchungsjournal · {untertitel}")
    breiten = [20, 14, 14, 8, 24, 62, 34, 14]
    koepfe = ["Datum", "Soll", "Haben", "BU", "Betrag", "Text", "Partner", "Via"]
    pdf.set_font("helvetica", "B", 8)
    pdf.set_fill_color(243, 241, 236)
    for b, k in zip(breiten, koepfe):
        pdf.cell(b, 7, _s(k), fill=True)
    pdf.ln()
    pdf.set_font("helvetica", "", 8)
    summe = Decimal("0")
    for r in rows:
        betrag = Decimal(str(r["betrag"]))
        vorzeichen = "+" if r.get("richtung") == "einnahme" else "-"
        summe += betrag if r.get("richtung") == "einnahme" else -betrag
        werte = [
            ".".join(reversed(r["datum"].split("-"))), r["soll"], r["haben"],
            str(r["bu"] or ""), f"{vorzeichen}{betrag:,.2f} EUR".replace(",", "X").replace(".", ",").replace("X", "."),
            (r["text"] or "")[:36], (r["partner"] or "")[:21],
            (r["entschieden_via"] or r["origin"] or "")[:10],
        ]
        for b, wert in zip(breiten, werte):
            pdf.cell(b, 6, _s(wert), border="B")
        pdf.ln()
    pdf.ln(3)
    pdf.set_font("helvetica", "B", 9)
    saldo = f"{summe:,.2f} EUR".replace(",", "X").replace(".", ",").replace("X", ".")
    pdf.cell(0, 7, _s(f"{len(rows)} Sätze · Saldo {saldo}"),
             new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())
