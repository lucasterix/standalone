"""bank_verbindung + passwort_reset (kamen im selben Release wie die Baseline).

create_all mit checkfirst: legt nur an, was fehlt — läuft auf frischen
DBs (alles schon da) genauso sauber wie auf gestempelten Bestands-DBs.
"""
from alembic import op

from app.db import Base
import app.models  # noqa: F401

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    op.drop_table("bank_verbindung")
    op.drop_table("passwort_reset")
