"""Autopilot: sichere Vorschläge automatisch bestätigen — mit Rückweg.

FZR-Grundsatz: Der Engpass ist nie das Erkennen, sondern das Bestätigen.
Automatisch bestätigt wird NUR sichere Herkunft; alles trägt
``entschieden_via="auto"`` und ist per ``revert`` umkehrbar. Der Fallback
(0.40) wird NIE automatisch gebucht.

Stufen (Org-Einstellung):
  vorsichtig — nur OPOS-exakte Zahlungen und Kostenträger-Buchungen
  ausgewogen — + Partner-Regeln & gelernte Muster (origin regel, ≥0.90)
  mutig      — + Historie ab 2 Bestätigungen (0.75 mit origin historie)
"""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fibu import Journal
from app.models.org import Org


def _erlaubt(j: Journal, stufe: str) -> bool:
    conf = Decimal(j.confidence or 0)
    if j.origin == "fallback":
        return False
    if stufe == "vorsichtig":
        return j.origin == "kostentraeger" or (
            j.origin == "regel" and "offenen Posten" in (j.begruendung or "")
        )
    if stufe == "mutig":
        return conf >= Decimal("0.75") and j.origin in ("regel", "kostentraeger", "historie")
    # ausgewogen (Default)
    return conf >= Decimal("0.90") and j.origin in ("regel", "kostentraeger")


def run(db: Session, org_id: int, *, dry_run: bool = False) -> dict:
    org = db.get(Org, org_id)
    stufe = org.autopilot_stufe if org else "ausgewogen"
    offene = db.scalars(
        select(Journal).where(
            Journal.org_id == org_id, Journal.status == "vorgeschlagen"
        )
    ).all()
    bestaetigt = 0
    for j in offene:
        if _erlaubt(j, stufe):
            if not dry_run:
                j.status = "bestaetigt"
                j.entschieden_via = "auto"
            bestaetigt += 1
    if not dry_run:
        db.commit()
    return {"stufe": stufe, "geprueft": len(offene), "bestaetigt": bestaetigt,
            "dry_run": dry_run}


def revert(db: Session, org_id: int) -> int:
    """Alle Auto-Bestätigungen zurück auf ``vorgeschlagen`` (Not-Aus).
    Bereits exportierte (``gebucht``) bleiben unangetastet."""
    rows = db.scalars(
        select(Journal).where(
            Journal.org_id == org_id,
            Journal.status == "bestaetigt",
            Journal.entschieden_via == "auto",
        )
    ).all()
    for j in rows:
        j.status = "vorgeschlagen"
        j.entschieden_via = None
    db.commit()
    return len(rows)
