"""Namens-Normalisierung + Partner-Auflösung + Lern-Historie.

FZR-Erfahrung: Banken zerreißen Namen („D ie Gesu ndheitskas.f") und ordnen
Wörter um („Schmutz, Lucas" vs. „Lucas Schmutz") — deshalb ZWEI Schlüssel:
* ``norm``      — lower/trim/Whitespace kollabiert (exakter Vergleich),
* ``name_key``  — zusätzlich Satzzeichen → Space und Tokens SORTIERT
                  (reihenfolge-unabhängig; Fuzzy nur bei EINDEUTIGEM Treffer).
"""
from __future__ import annotations

import re
from collections import Counter
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fibu import Journal, Personenkonto

_NONWORD = re.compile(r"[^0-9a-zäöüß]+", re.IGNORECASE)

# Ab so vielen gleichen BESTÄTIGTEN Buchungen gilt Partner→Konto als gelernt
# (origin "regel", 0.90 → autopilot-fähig). FZR-Wert, bewährt.
LEARN_AUTO_MIN = 3


def norm(name: str | None) -> str:
    return " ".join((name or "").strip().lower().split())


def name_key(name: str | None) -> str:
    tokens = [t for t in _NONWORD.split((name or "").lower()) if t]
    return " ".join(sorted(tokens))


def resolve_personenkonto(
    db: Session, org_id: int, typ: str, name: str | None, iban: str | None = None,
) -> Personenkonto | None:
    """IBAN exakt → Name exakt (norm) → name_key, nur bei eindeutigem Treffer."""
    if iban:
        pk = db.scalar(
            select(Personenkonto).where(
                Personenkonto.org_id == org_id,
                Personenkonto.typ == typ,
                Personenkonto.iban == iban.replace(" ", "").upper(),
            )
        )
        if pk:
            return pk
    n = norm(name)
    if not n:
        return None
    pk = db.scalar(
        select(Personenkonto).where(
            Personenkonto.org_id == org_id,
            Personenkonto.typ == typ,
            Personenkonto.name_norm == n,
        )
    )
    if pk:
        return pk
    key = name_key(name)
    if not key:
        return None
    treffer = db.scalars(
        select(Personenkonto).where(
            Personenkonto.org_id == org_id,
            Personenkonto.typ == typ,
            Personenkonto.name_key == key,
        )
    ).all()
    return treffer[0] if len(treffer) == 1 else None


def gelerntes_konto(
    db: Session, org_id: int, partner_nr: str | None, partner_name: str | None,
) -> tuple[str, int] | None:
    """Dominantes Erfolgskonto aus BESTÄTIGTEN Buchungen dieses Partners:
    ``(konto, anzahl)`` — oder None. Zählt je Partner-Nr, sonst je name_key."""
    q = select(Journal.soll, Journal.haben).where(
        Journal.org_id == org_id,
        Journal.status.in_(("bestaetigt", "gebucht")),
    )
    if partner_nr:
        q = q.where(Journal.partner_nr == partner_nr)
    else:
        key = name_key(partner_name)
        if not key:
            return None
        rows_all = db.execute(
            select(Journal.soll, Journal.haben, Journal.partner_name).where(
                Journal.org_id == org_id,
                Journal.status.in_(("bestaetigt", "gebucht")),
                Journal.partner_name.isnot(None),
            )
        ).all()
        rows = [(s, h) for s, h, pn in rows_all if name_key(pn) == key]
        return _dominant(rows)
    rows = db.execute(q).all()
    return _dominant(rows)


def _dominant(rows) -> tuple[str, int] | None:
    zaehler: Counter[str] = Counter()
    for soll, haben in rows:
        # Erfolgskonto = die Nicht-Personenkonto-/Nicht-Bank-Seite ≤4-stellig.
        for k in (soll, haben):
            if k and len(k) <= 4 and k[:1] in ("4", "5", "6", "7"):
                zaehler[k] += 1
    if not zaehler:
        return None
    konto, n = zaehler.most_common(1)[0]
    return konto, n


CONF_SICHER = Decimal("0.90")
CONF_HISTORIE = Decimal("0.75")
CONF_FALLBACK = Decimal("0.40")
