"""PSD2-Sync: State-Sicherung, Mapping, Dedup — EB-API gemockt."""
from datetime import date


def _org(client, email, firma):
    r = client.post("/auth/registrieren", json={
        "email": email, "name": "T", "passwort": "passwort-1234",
        "org_name": firma, "org_chart": "skr45",
    })
    return r.json()["org_id"]


def test_state_token_und_gating(client, monkeypatch):
    from app.services import bank_sync
    org = _org(client, "psd2@test.example", "PSD2 GmbH")

    # Ohne Env: sauberes Gating
    r = client.get(f"/orgs/{org}/bank/verbindung")
    assert r.json()["konfiguriert"] is False
    assert client.post(f"/orgs/{org}/bank/verbinden",
                       json={"bank_name": "Sparkasse"}).status_code == 503

    # State-Token: manipulationssicher
    s = bank_sync.state_token(org)
    assert bank_sync.state_pruefen(s) == org
    assert bank_sync.state_pruefen(f"{org + 1}." + s.split(".")[1]) is None
    r = client.post(f"/orgs/{org}/bank/callback",
                    json={"code": "x", "state": "1.kaputt"})
    assert r.status_code == 400


def test_sync_mapping_und_dedup(client, monkeypatch):
    from app.services import bank_sync
    from app.models.bankverbindung import BankVerbindung
    from app.db import SessionLocal

    org = _org(client, "psd2b@test.example", "PSD2 B GmbH")
    db = SessionLocal()
    db.add(BankVerbindung(org_id=org, status="aktiv", session_id="s",
                          account_uid="acc-1"))
    db.commit(); db.close()

    seiten = [{
        "transactions": [
            {"entry_reference": "R1", "booking_date": "2026-07-01",
             "transaction_amount": {"amount": "120.00", "currency": "EUR"},
             "credit_debit_indicator": "CRDT",
             "debtor": {"name": "AOK Nordost Pflegekasse"},
             "debtor_account": {"iban": "DE55666677778888999900"},
             "remittance_information": ["SAMMELAVIS"]},
            {"entry_reference": "R2", "booking_date": "2026-07-02",
             "transaction_amount": {"amount": "80.00", "currency": "EUR"},
             "credit_debit_indicator": "DBIT",
             "creditor": {"name": "Stadtwerke"},
             "creditor_account": {"iban": "DE33444455556666777788"},
             "remittance_information": ["Abschlag"]},
        ],
        "continuation_key": None,
    }]

    class FakeResp:
        status_code = 200
        def __init__(self, daten): self._d = daten
        def json(self): return self._d
        def raise_for_status(self): pass

    monkeypatch.setattr(bank_sync.httpx, "get",
                        lambda *a, **k: FakeResp(seiten[0]))
    monkeypatch.setattr(bank_sync, "_headers", lambda: {})

    r = client.post(f"/orgs/{org}/bank/sync")
    assert r.status_code == 200
    d = r.json()
    assert d["neu"] == 2 and d["vorgeschlagen"] == 2

    # Zweiter Lauf: Dedup — nichts Neues
    r = client.post(f"/orgs/{org}/bank/sync")
    assert r.json()["neu"] == 0

    js = client.get(f"/orgs/{org}/journal?suche=Stadtwerke").json()
    assert js and js[0]["richtung"] == "ausgabe"
