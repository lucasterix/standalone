"""Migrations-Einstieg für den Container-Start.

Drei Fälle, alle idempotent:
1. Frische DB              → alembic upgrade head (Baseline baut alles).
2. Bestands-DB ohne Stempel → auf Baseline stempeln, dann upgrade head.
3. Gestempelte DB           → upgrade head (No-Op, wenn aktuell).
"""
from __future__ import annotations

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db import engine

BASELINE = "0001"


def main() -> None:
    cfg = Config("alembic.ini")
    insp = inspect(engine)
    tabellen = set(insp.get_table_names())
    if "org" in tabellen and "alembic_version" not in tabellen:
        print(f"Bestands-DB erkannt — stemple auf Baseline {BASELINE}")
        command.stamp(cfg, BASELINE)
    command.upgrade(cfg, "head")
    print("Migrationen aktuell.")


if __name__ == "__main__":
    main()
