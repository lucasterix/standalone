"""Klärungs-Assistent: verwandelt niedrige Konfidenz in EINE gute Frage.

Grundsatz (Ehrlichkeit vor Zauber): Der Assistent rät nicht — er erkennt
Situationen, in denen eine einfache Nutzer-Antwort viele offene Fälle auf
einmal richtig macht, und lernt aus der Antwort dauerhaft (Personenkonto
und/oder Partner-Regel). Drei Situationen, aus dem FZR-Echtbetrieb:

1. sv_beitraege     — Ausgaben an Einzugsstellen/Kassen: fast sicher
                      SV-Beiträge, aber nie automatisch buchen ohne Ja.
2. patient_zuzahlung — Private Einzahler mit Zuzahlung/Rechnung im Zweck:
                      vermutlich Patienten → Personenkonto + künftig
                      Kostenträger-Weg.
3. partner_offen    — Derselbe unbekannte Partner mehrfach offen: eine
                      Konto-Antwort erledigt alle + Regel für die Zukunft.

Fragen sind nach Hebel sortiert (erledigte Fälle × Betrag).
"""
from __future__ import annotations

import re
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bank import BankKonto
from app.models.fibu import Journal, PartnerRegel, Personenkonto, SkrKonto
from app.models.org import Org
from app.services.chart_profile import get_profile
from app.services.history import name_key, norm

_SV_MUSTER = re.compile(
    r"einzugsstelle|krankenkasse|knappschaft|minijob|rentenversicherung"
    r"|berufsgenossenschaft|sozialversicherung|sv-beitr", re.I)
_PATIENT_ZWECK = re.compile(r"zuzahlung|eigenanteil|rechnung|re-\d|rg\.?\s?\d", re.I)
_FIRMEN_MUSTER = re.compile(
    r"gmbh|ag\b|kg\b|ohg|e\.?k\.?|ug\b|stiftung|verein|kasse|bank|versicherung", re.I)

# Konto-Vorschläge je Fragetyp: Stichworte gegen den Org-Kontenrahmen.
_VORSCHLAG_STICHWORTE = {
    "partner_offen_ausgabe": (
        "material", "waren", "fremdleistung", "büro", "instandhaltung",
        "beiträge", "sonstige",
    ),
    "partner_offen_einnahme": ("erlöse", "erträge", "zuschüsse", "sonstige"),
}


def _konto_vorschlaege(db: Session, org_id: int, stichworte: tuple[str, ...],
                       klassen: tuple[str, ...], max_n: int = 4) -> list[dict]:
    out, gesehen = [], set()
    konten = db.scalars(
        select(SkrKonto).where(SkrKonto.org_id == org_id)
    ).all()
    for wort in stichworte:
        for k in konten:
            if k.nummer in gesehen or k.nummer[:1] not in klassen:
                continue
            if wort in (k.bezeichnung or "").lower():
                out.append({"konto": k.nummer, "name": k.bezeichnung})
                gesehen.add(k.nummer)
                if len(out) >= max_n:
                    return out
    return out


def fragen(db: Session, org_id: int, max_fragen: int = 5) -> list[dict]:
    org = db.get(Org, org_id)
    prof = get_profile(org.chart if org else None)
    offene = db.scalars(
        select(Journal).where(
            Journal.org_id == org_id,
            Journal.status == "vorgeschlagen",
            Journal.origin == "fallback",
        )
    ).all()
    if not offene:
        return []

    bank_konten = {
        k.sachkonto for k in db.scalars(
            select(BankKonto).where(BankKonto.org_id == org_id)
        )
    } or {prof.bank}

    bekannte_keys = {
        p.name_key for p in db.scalars(
            select(Personenkonto).where(Personenkonto.org_id == org_id)
        ) if p.name_key
    }

    # Gruppieren nach Partner-Schlüssel.
    gruppen: dict[str, list[Journal]] = {}
    for j in offene:
        key = name_key(j.partner_name or j.text or "")
        if key:
            gruppen.setdefault(key, []).append(j)

    ergebnis = []
    for key, js in gruppen.items():
        anzeigename = js[0].partner_name or js[0].text or "Unbekannt"
        einnahmen = [j for j in js if j.soll in bank_konten]
        ausgaben = [j for j in js if j not in einnahmen]
        summe = sum(Decimal(j.betrag or 0) for j in js)
        basis = {
            "partner": anzeigename,
            "partner_key": key,
            "anzahl": len(js),
            "summe": str(summe),
            "journal_ids": [j.id for j in js],
        }

        # 1) SV-Beiträge (Ausgabe an Einzugsstelle o. ä.)
        if ausgaben and prof.sozialversicherung and _SV_MUSTER.search(anzeigename):
            ergebnis.append({
                **basis, "typ": "sv_beitraege",
                "frage": f"{len(js)} Zahlungen an „{anzeigename}“ sehen nach "
                         "Sozialversicherungs-Beiträgen aus. Stimmt das?",
                "hinweis": "SV-Beiträge laufen aufs Verrechnungskonto "
                           f"{prof.sozialversicherung} — nach Ihrem Ja künftig automatisch.",
                "vorschlaege": [{"konto": prof.sozialversicherung,
                                 "name": "SV-Beiträge (Verrechnung)"}],
                "hebel": len(js) * 3,
            })
            continue

        # 2) Patient/Kunde (private Einnahme mit Zuzahlungs-Signal)
        if (einnahmen and key not in bekannte_keys
                and not _FIRMEN_MUSTER.search(anzeigename)
                and any(_PATIENT_ZWECK.search(j.text or "") for j in einnahmen)):
            ergebnis.append({
                **basis, "typ": "patient_zuzahlung",
                "journal_ids": [j.id for j in einnahmen],
                "anzahl": len(einnahmen),
                "frage": f"„{anzeigename}“ hat {len(einnahmen)}× eingezahlt "
                         "(Zuzahlung/Rechnung im Zweck). Ist das ein Patient "
                         "oder Kunde von Ihnen?",
                "hinweis": "Bei Ja lege ich ein Kundenkonto an — künftige "
                           "Zahlungen bucht der Autopilot dann von selbst.",
                "vorschlaege": [],
                "hebel": len(einnahmen) * 2,
            })
            continue

        # 3) Wiederkehrender unbekannter Partner (nur ab 2 Fällen fragen —
        #    Einzelfälle gehören in die Prüfliste, nicht in ein Popup).
        if len(js) >= 2:
            richtung = "einnahme" if len(einnahmen) >= len(ausgaben) else "ausgabe"
            klassen = prof.ertrag_klassen if richtung == "einnahme" else prof.aufwand_klassen
            stichworte = _VORSCHLAG_STICHWORTE[
                "partner_offen_einnahme" if richtung == "einnahme" else "partner_offen_ausgabe"]
            ergebnis.append({
                **basis, "typ": "partner_offen",
                "richtung": richtung,
                "frage": f"„{anzeigename}“ taucht {len(js)}× auf "
                         f"({summe} € gesamt), und ich kenne noch kein Konto "
                         "dafür. Was ist das für ein Posten?",
                "hinweis": "Ihre Antwort bucht alle offenen Fälle und wird "
                           "als Regel gemerkt — die Frage kommt nie wieder.",
                "vorschlaege": _konto_vorschlaege(db, org_id, stichworte, klassen),
                "hebel": len(js),
            })

    ergebnis.sort(key=lambda f: -f["hebel"])
    return ergebnis[:max_fragen]


def antworten(db: Session, org_id: int, *, typ: str, partner_key: str,
              journal_ids: list[int], konto: str | None = None,
              ist_patient: bool = False) -> dict:
    """Wendet eine Antwort an: bucht die offenen Fälle um + lernt dauerhaft."""
    org = db.get(Org, org_id)
    prof = get_profile(org.chart if org else None)
    js = [
        j for j in db.scalars(
            select(Journal).where(
                Journal.id.in_(journal_ids), Journal.org_id == org_id,
                Journal.status == "vorgeschlagen",
            )
        )
    ]
    if not js:
        return {"gebucht": 0, "gelernt": None}

    bank_konten = {
        k.sachkonto for k in db.scalars(
            select(BankKonto).where(BankKonto.org_id == org_id)
        )
    } or {prof.bank}
    anzeigename = js[0].partner_name or js[0].text or "Unbekannt"
    gelernt = None

    if typ == "patient_zuzahlung" and ist_patient:
        # Kundenkonto anlegen → heutige + künftige Zahlungen auf Personenkonto.
        pk = db.scalar(select(Personenkonto).where(
            Personenkonto.org_id == org_id,
            Personenkonto.name_key == partner_key,
            Personenkonto.typ == "debitor",
        ))
        if pk is None:
            max_nr = max((int(p.nummer) for p in db.scalars(
                select(Personenkonto).where(
                    Personenkonto.org_id == org_id, Personenkonto.typ == "debitor")
            ) if p.nummer.isdigit()), default=prof.debitor_start - 1)
            pk = Personenkonto(
                org_id=org_id, typ="debitor", nummer=str(max_nr + 1),
                name=anzeigename, name_norm=norm(anzeigename),
                name_key=partner_key,
            )
            db.add(pk)
            db.flush()
        for j in js:
            bank = j.soll if j.soll in bank_konten else j.haben
            j.soll, j.haben = bank, pk.nummer
            j.partner_nr = pk.nummer
            j.status = "bestaetigt"
            j.entschieden_via = "assistent"
            j.begruendung = f"Assistent: Patient/Kunde → Personenkonto {pk.nummer}"
        gelernt = f"Kundenkonto {pk.nummer} angelegt"
    else:
        if not konto or not (konto.isdigit() and len(konto) == 4):
            raise ValueError("Konto: 4-stelliges Sachkonto nötig")
        war_einnahme = js[0].soll in bank_konten
        for j in js:
            einnahme = j.soll in bank_konten
            bank = j.soll if einnahme else j.haben
            j.soll, j.haben = (bank, konto) if einnahme else (konto, bank)
            j.status = "bestaetigt"
            j.entschieden_via = "assistent"
            j.begruendung = f"Assistent: Antwort → Konto {konto}"
        # Nachhaltig: Personenkonto (falls fehlt) + Partner-Regel.
        typ_pk = "debitor" if war_einnahme else "kreditor"
        pk = db.scalar(select(Personenkonto).where(
            Personenkonto.org_id == org_id,
            Personenkonto.name_key == partner_key,
        ))
        if pk is None:
            start = prof.debitor_start if typ_pk == "debitor" else prof.kreditor_start
            max_nr = max((int(p.nummer) for p in db.scalars(
                select(Personenkonto).where(
                    Personenkonto.org_id == org_id, Personenkonto.typ == typ_pk)
            ) if p.nummer.isdigit()), default=start - 1)
            pk = Personenkonto(
                org_id=org_id, typ=typ_pk, nummer=str(max_nr + 1),
                name=anzeigename, name_norm=norm(anzeigename), name_key=partner_key,
            )
            db.add(pk)
            db.flush()
        regel = db.scalar(select(PartnerRegel).where(
            PartnerRegel.org_id == org_id, PartnerRegel.personenkonto_id == pk.id))
        if regel is None:
            db.add(PartnerRegel(org_id=org_id, personenkonto_id=pk.id,
                                konto=konto, quelle="assistent"))
        else:
            regel.konto, regel.aktiv = konto, True
        for j in js:
            j.partner_nr = pk.nummer
        gelernt = f"Regel: {anzeigename} → {konto}"

    db.commit()
    return {"gebucht": len(js), "gelernt": gelernt}
