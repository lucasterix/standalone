"""Kontenrahmen-Seed beim Org-Anlegen: der passende Kern (SKR45/SKR04) steht
sofort — kein leerer Kontenplan, kein Nachladen."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fibu import SkrKonto
from app.services.skr_kern import SKR04_KERN, SKR45_KERN


def seed_kontenrahmen(db: Session, org_id: int, chart: str) -> int:
    kern = SKR45_KERN if (chart or "").upper() == "SKR45" else SKR04_KERN
    vorhanden = set(
        db.scalars(select(SkrKonto.nummer).where(SkrKonto.org_id == org_id))
    )
    neu = 0
    for nummer, bezeichnung, art, _auto, _satz in kern:
        if nummer in vorhanden:
            continue
        db.add(SkrKonto(org_id=org_id, nummer=nummer,
                        bezeichnung=bezeichnung[:200], art=art, aktiv=True))
        neu += 1
    db.flush()
    return neu
