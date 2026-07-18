"""Kontierungs-Engine: Bank-Transaktionen → Journal-Vorschläge.

Die propose-Leiter (FZR-Echtbetrieb, >23k Transaktionen):
  1. OPOS-Match         — exakte Zahlung auf offenen Posten (Betrag + Name)
  2. Kostenträger-Modus — Einnahme eines BEKANNTEN Debitors → „Bank an
                          Debitor" (Personenkonto); der Erlös entsteht aus
                          der Rechnung, nie aus einem geratenen Ertragskonto
  3. Partner-Regel      — fester Partner→Konto-Treffer (0.90, autopilot-fähig)
  4. Gelernte Historie  — ≥3 gleiche Bestätigungen ⇒ wie Regel (0.90),
                          sonst Vorschlag (0.75)
  5. Muster             — Zweck-Muster (Lohn/Gehalt → Lohn-Verbindlichkeit)
  6. Fallback           — Profil-Fallbackkonto (0.40, NIE automatisch)

Invarianten: Betrag im Journal positiv; dedup ``tx:{id}`` je Org; Wieder-
holläufe idempotent; ``force`` verwirft nur ``vorgeschlagen``-Sätze.
"""
from __future__ import annotations

import re
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.bank import BankKonto, BankTransaktion
from app.models.fibu import Journal, OposPosten, PartnerRegel, Personenkonto
from app.models.org import Org
from app.services import einstellungen, history
from app.services.chart_profile import ChartProfile, get_profile

_LOHN_MUSTER = re.compile(r"lohn|gehalt", re.IGNORECASE)


def _add(db: Session, org_id: int, tx: BankTransaktion, *, soll: str, haben: str,
         bank_sachkonto: str, origin: str, conf: Decimal, text: str,
         begruendung: str, partner: Personenkonto | None = None,
         bu: int | None = None) -> Journal:
    j = Journal(
        org_id=org_id, tx_id=tx.id, beleg_datum=tx.buchungstag,
        jahr=tx.buchungstag.year, betrag=abs(tx.betrag), soll=soll, haben=haben,
        bu=bu, text=text[:120],
        partner_typ=partner.typ if partner else None,
        partner_nr=partner.nummer if partner else None,
        partner_name=(partner.name if partner else tx.name or None),
        status="vorgeschlagen", origin=origin, confidence=conf,
        begruendung=begruendung[:300], dedup_key=f"tx:{tx.id}",
    )
    db.add(j)
    return j


def propose(db: Session, org_id: int, *, force: bool = False) -> dict:
    org = db.get(Org, org_id)
    if org is None:
        raise ValueError("Org nicht gefunden")
    prof = get_profile(org.chart)
    est = einstellungen.fuer_org(db, org_id)

    regeneriert = 0
    if force:
        regeneriert = db.execute(
            delete(Journal).where(
                Journal.org_id == org_id,
                Journal.status == "vorgeschlagen",
            )
        ).rowcount or 0
        db.flush()

    vorhanden = set(
        db.scalars(select(Journal.dedup_key).where(Journal.org_id == org_id))
    )
    konten = {k.id: k for k in db.scalars(
        select(BankKonto).where(BankKonto.org_id == org_id)
    )}
    regeln = {
        r.personenkonto_id: r
        for r in db.scalars(
            select(PartnerRegel).where(
                PartnerRegel.org_id == org_id, PartnerRegel.aktiv.is_(True)
            )
        )
    }

    stats = {"neu": 0, "uebersprungen": 0, "kostentraeger": 0, "regel": 0,
             "historie": 0, "muster": 0, "fallback": 0, "opos": 0,
             "regeneriert": regeneriert}

    txs = db.scalars(
        select(BankTransaktion)
        .where(BankTransaktion.org_id == org_id)
        .order_by(BankTransaktion.buchungstag, BankTransaktion.id)
    ).all()

    for tx in txs:
        if f"tx:{tx.id}" in vorhanden:
            stats["uebersprungen"] += 1
            continue
        bank = konten[tx.konto_id].sachkonto if tx.konto_id in konten else prof.bank
        einnahme = tx.betrag > 0
        typ = "debitor" if einnahme else "kreditor"
        text = (tx.zweck or tx.name or "")[:120]

        partner = history.resolve_personenkonto(db, org_id, typ, tx.name, tx.gegen_iban)

        # 1) OPOS-Match: exakter Betrag + Partner/Name passt → Zahlungsbuchung.
        posten = _find_open_posten(db, org_id, typ, abs(tx.betrag), tx.name, partner)
        if posten is not None:
            pk_nr = _posten_konto(db, posten, partner)
            if pk_nr:
                soll, haben = (bank, pk_nr) if einnahme else (pk_nr, bank)
                j = _add(db, org_id, tx, soll=soll, haben=haben, bank_sachkonto=bank,
                         origin="regel", conf=history.CONF_SICHER, text=text,
                         begruendung=f"Zahlung auf offenen Posten {posten.rechnung_nr or posten.id}",
                         partner=partner)
                posten.status = "bezahlt"
                stats["opos"] += 1
                stats["neu"] += 1
                continue

        # 2) Kostenträger-Modus: bekannter Debitor ⇒ Bank an Personenkonto.
        if (est.kostentraeger_modus and prof.einnahme_auf_personenkonto
                and einnahme and partner is not None):
            _add(db, org_id, tx, soll=bank, haben=partner.nummer, bank_sachkonto=bank,
                 origin="kostentraeger", conf=history.CONF_SICHER, text=text,
                 begruendung=f"Debitor-Zahlung auf Personenkonto {partner.nummer} "
                             "(Erlös folgt aus der Rechnung)", partner=partner)
            stats["kostentraeger"] += 1
            stats["neu"] += 1
            continue

        # 3) Partner-Regel.
        regel = regeln.get(partner.id) if partner else None
        if regel is not None:
            soll, haben = (bank, regel.konto) if einnahme else (regel.konto, bank)
            _add(db, org_id, tx, soll=soll, haben=haben, bank_sachkonto=bank,
                 origin="regel", conf=history.CONF_SICHER, text=text,
                 begruendung=f"Partner-Regel {partner.nummer} → {regel.konto}",
                 partner=partner, bu=regel.bu)
            stats["regel"] += 1
            stats["neu"] += 1
            continue

        # 4) Gelernte Historie.
        gelernt = history.gelerntes_konto(
            db, org_id, partner.nummer if partner else None, tx.name
        )
        if gelernt is not None:
            konto, n = gelernt
            soll, haben = (bank, konto) if einnahme else (konto, bank)
            sicher = n >= est.lern_schwelle
            _add(db, org_id, tx, soll=soll, haben=haben, bank_sachkonto=bank,
                 origin="regel" if sicher else "historie",
                 conf=history.CONF_SICHER if sicher else history.CONF_HISTORIE,
                 text=text,
                 begruendung=f"{n}× so bestätigt → Konto {konto}"
                             + (" (automatisch)" if sicher else ""),
                 partner=partner)
            stats["historie"] += 1
            stats["neu"] += 1
            continue

        # 5) Zweck-Muster: Lohn/Gehalt (Ausgang) → Lohn-Verbindlichkeit.
        if (est.lohn_muster_aktiv and not einnahme and prof.lohn_verbindlichkeit
                and _LOHN_MUSTER.search(f"{tx.zweck} {tx.name}")):
            _add(db, org_id, tx, soll=prof.lohn_verbindlichkeit, haben=bank,
                 bank_sachkonto=bank, origin="regel", conf=history.CONF_SICHER,
                 text=text,
                 begruendung=f"Lohn/Gehalt-Muster → {prof.lohn_verbindlichkeit}",
                 partner=partner)
            stats["muster"] += 1
            stats["neu"] += 1
            continue

        # 6) Fallback (Prüfliste, nie automatisch).
        konto = ((est.fallback_erloes or prof.fallback_erloes) if einnahme
                 else (est.fallback_aufwand or prof.fallback_aufwand))
        soll, haben = (bank, konto) if einnahme else (konto, bank)
        bu = prof.bu_default_einnahme if einnahme else prof.bu_default_ausgabe
        _add(db, org_id, tx, soll=soll, haben=haben, bank_sachkonto=bank,
             origin="fallback", conf=history.CONF_FALLBACK, text=text,
             begruendung="Kein Muster erkannt — bitte einmal zuordnen",
             partner=partner, bu=bu)
        stats["fallback"] += 1
        stats["neu"] += 1

    db.commit()
    return stats


def _find_open_posten(db: Session, org_id: int, typ: str, betrag: Decimal,
                      name: str | None, partner: Personenkonto | None) -> OposPosten | None:
    q = select(OposPosten).where(
        OposPosten.org_id == org_id, OposPosten.typ == typ,
        OposPosten.status == "offen", OposPosten.betrag == betrag,
    )
    kandidaten = db.scalars(q).all()
    if not kandidaten:
        return None
    if partner is not None:
        for p in kandidaten:
            if p.personenkonto_id == partner.id:
                return p
    key = history.name_key(name)
    for p in kandidaten:
        if key and history.name_key(p.partner_name) == key:
            return p
    return None


def _posten_konto(db: Session, posten: OposPosten, partner: Personenkonto | None) -> str | None:
    if posten.personenkonto_id:
        pk = db.get(Personenkonto, posten.personenkonto_id)
        return pk.nummer if pk else None
    return partner.nummer if partner else None


def lerne_regel(db: Session, org_id: int, personenkonto_id: int, konto: str,
                bu: int | None = None, quelle: str = "gelernt") -> PartnerRegel:
    """Regel setzen/aktualisieren + auf offene Vorschläge des Partners anwenden."""
    regel = db.scalar(
        select(PartnerRegel).where(
            PartnerRegel.org_id == org_id,
            PartnerRegel.personenkonto_id == personenkonto_id,
        )
    )
    if regel is None:
        regel = PartnerRegel(org_id=org_id, personenkonto_id=personenkonto_id,
                             konto=konto, bu=bu, quelle=quelle)
        db.add(regel)
    else:
        regel.konto, regel.bu, regel.aktiv = konto, bu, True
    db.flush()

    pk = db.get(Personenkonto, personenkonto_id)
    org = db.get(Org, org_id)
    prof = get_profile(org.chart if org else None)
    offene = db.scalars(
        select(Journal).where(
            Journal.org_id == org_id, Journal.status == "vorgeschlagen",
            Journal.partner_nr == (pk.nummer if pk else None),
        )
    ).all()
    for j in offene:
        richtung = prof.richtung(j.soll, j.haben)
        # Bank-Seite steht — nur die Gegenseite wird umkontiert.
        if richtung == "einnahme":
            j.haben = konto
        elif richtung == "ausgabe":
            j.soll = konto
        else:
            continue
        j.bu = bu
        j.origin = "regel"
        j.confidence = history.CONF_SICHER
        j.begruendung = f"Partner-Regel {pk.nummer if pk else ''} → {konto}"
    db.flush()
    return regel
