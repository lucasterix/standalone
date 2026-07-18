"""Baseline: friert den Stand aller Tabellen ein (18.07.2026).

Bestands-Datenbanken werden beim App-Start automatisch auf diese
Revision GESTEMPELT (app/migrate.py) — neue Datenbanken bauen alles
über die Modelle auf. Ab jetzt: jede Schemaänderung = eigene Revision.
"""
from alembic import op

from app.db import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    raise RuntimeError("Baseline ist nicht rückbaubar")
