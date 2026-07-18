"""Alembic-Env: nimmt die URL aus KK_DATABASE_URL (wie die App selbst)."""
import os

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db import Base
import app.models  # noqa: F401 — alle Modelle registrieren

config = context.config
config.set_main_option(
    "sqlalchemy.url",
    os.environ.get("KK_DATABASE_URL", "sqlite:///./kontoklar.db"),
)
target_metadata = Base.metadata


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
