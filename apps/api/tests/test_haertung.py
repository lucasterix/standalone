"""Login-Härtung: Rate-Limit, Passwort ändern, Reset-Flow."""


def test_passwort_aendern_und_reset(client):
    client.post("/auth/registrieren", json={
        "email": "hart@test.example", "name": "T", "passwort": "start-passwort-1",
        "org_name": "Hart GmbH", "org_chart": "skr45",
    })
    # ändern → alle Sessions tot → neu anmelden mit neuem Passwort
    r = client.post("/auth/passwort-aendern",
                    json={"aktuelles": "start-passwort-1", "neues": "neues-passwort-2"})
    assert r.status_code == 200
    assert client.get("/auth/ich").status_code == 401
    r = client.post("/auth/login",
                    json={"email": "hart@test.example", "passwort": "neues-passwort-2"})
    assert r.status_code == 200

    # Reset-Flow (ohne SMTP: Token landet im Log — hier direkt aus der DB)
    client.post("/auth/passwort-vergessen", json={"email": "hart@test.example"})
    # Token ist nur als Hash gespeichert → über den Log-Weg nicht testbar;
    # wir prüfen die API-Verträge: falscher Token lehnt sauber ab.
    r = client.post("/auth/passwort-reset",
                    json={"token": "falsch", "neues": "egal-egal-egal"})
    assert r.status_code == 400


def test_login_rate_limit(client):
    client.post("/auth/registrieren", json={
        "email": "limit@test.example", "name": "T", "passwort": "start-passwort-1",
        "org_name": "Limit GmbH", "org_chart": "skr45",
    })
    client.post("/auth/logout")
    for _ in range(10):
        r = client.post("/auth/login",
                        json={"email": "limit@test.example", "passwort": "falsch-falsch"})
        assert r.status_code == 401
    r = client.post("/auth/login",
                    json={"email": "limit@test.example", "passwort": "falsch-falsch"})
    assert r.status_code == 429
