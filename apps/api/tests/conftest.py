"""Test-Fixtures.

WICHTIG: Die Datenbank-URL wird HIER — vor jedem App-Import — auf eine
Datei-SQLite gesetzt (SQLite-Memory taugt nicht mit Connection-Pools, und
Settings/Engine entstehen beim ersten Import). ``client`` setzt das Schema
je Test zurück; ``db`` baut sich eine eigene Wegwerf-Engine.
"""
import os
import tempfile

_fd, _pfad = tempfile.mkstemp(prefix="kontoklar-test-", suffix=".db")
os.close(_fd)
os.environ["KK_DATABASE_URL"] = f"sqlite:///{_pfad}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: F401, E402 — Modelle registrieren
from app.db import Base, engine  # noqa: E402


@pytest.fixture()
def db():
    """Isolierte Session auf eigener Wegwerf-Engine (Service-Unit-Tests)."""
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng, autoflush=False)
    s = Session()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture()
def client():
    """HTTP-Client gegen die App-Engine — Schema je Test frisch."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from app.main import app

    # https-Base, damit der Secure-Session-Cookie im Test mitgeschickt wird.
    with TestClient(app, base_url="https://testserver") as c:
        yield c
