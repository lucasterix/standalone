"""Auth + Mandantentrennung über die echte HTTP-Schicht:
Registrieren → Login → Org → fremder Zugriff verboten → Kanzlei-Mandat →
Rückfragen-Kanal → Vorjahres-Import (Bilanzkontinuität)."""
def _register(c, email, name, org_name=None, art="unternehmen"):
    r = c.post("/auth/registrieren", json={
        "email": email, "name": name, "passwort": "sehr-sicher-2026",
        "org_name": org_name, "org_art": art,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def test_auth_und_kanzlei_flow(client):
    c = client

    # Registrieren mit Org (Unternehmen, SKR45-Seed inklusive).
    u = _register(c, "sabine@sonnenweg.example", "Sabine Weber",
                  "Pflegedienst Sonnenweg GmbH")
    assert u["org_id"] is not None
    org_id = u["org_id"]

    # Falsches Passwort → 401 (eine Meldung, kein User-Enumeration).
    r = c.post("/auth/login", json={"email": "sabine@sonnenweg.example",
                                    "passwort": "falsch-falsch"})
    assert r.status_code == 401

    # Login + /auth/ich.
    r = c.post("/auth/login", json={"email": "sabine@sonnenweg.example",
                                    "passwort": "sehr-sicher-2026"})
    token = r.json()["token"]
    ich = c.get("/auth/ich", headers=_h(token)).json()
    assert ich["orgs"][0]["rolle"] == "inhaber"

    # Fremder Nutzer OHNE Mitgliedschaft: 403 auf die Org.
    fremd = _register(c, "fremd@example.com", "Fremd")
    r = c.get(f"/orgs/{org_id}/journal", headers=_h(fremd["token"]))
    assert r.status_code == 403

    # Kanzlei registriert sich, lädt ein, Unternehmen nimmt an.
    k = _register(c, "meyer@kanzlei.example", "Katrin Meyer",
                  "Steuerkanzlei Meyer", art="kanzlei")
    r = c.post(f"/kanzlei/{k['org_id']}/einladungen",
               json={"email": "sabine@sonnenweg.example"}, headers=_h(k["token"]))
    einladung = r.json()["einladungs_token"]
    r = c.post("/kanzlei/einladungen/annehmen",
               json={"token": einladung, "unternehmen_org_id": org_id},
               headers=_h(token))
    assert r.json()["ok"] is True

    # Jetzt darf die Kanzlei lesen (Rolle kanzlei) …
    r = c.get(f"/orgs/{org_id}/journal", headers=_h(k["token"]))
    assert r.status_code == 200

    # … und der ganze Fach-Durchstich läuft über HTTP:
    csv = ("Buchungstag;Betrag;Name;Verwendungszweck\n"
           "15.06.2026;-99,50;Aral;Tanken Pflegefahrzeug\n"
           "16.06.2026;-2450,00;Vermietung Janssen;Miete\n")
    r = c.post(f"/orgs/{org_id}/bank/import-csv",
               json={"csv_text": csv}, headers=_h(token))
    assert r.json()["neu"] == 2
    r = c.post(f"/orgs/{org_id}/propose", headers=_h(token))
    assert r.json()["neu"] == 2

    # Kanzlei stellt eine Rückfrage an einer Buchung; Unternehmen antwortet.
    j = c.get(f"/orgs/{org_id}/journal", headers=_h(token)).json()[0]
    r = c.post(f"/orgs/{org_id}/rueckfragen",
               json={"journal_id": j["id"], "text": "Wofür war das?"},
               headers=_h(k["token"]))
    rf_id = r.json()["id"]
    r = c.post(f"/rueckfragen/{rf_id}/antworten",
               json={"text": "Tankfüllung Tour Nord.", "schliessen": True},
               headers=_h(token))
    assert r.json()["status"] == "geschlossen"

    # Kanzlei-Cockpit zeigt das Mandat.
    r = c.get(f"/kanzlei/{k['org_id']}/cockpit", params={"jahr": 2026},
              headers=_h(k["token"]))
    mandate = r.json()["mandate"]
    assert len(mandate) == 1 and mandate[0]["org_id"] == org_id
    assert mandate[0]["offen"] == 2

    # Vorjahres-Import: Konto übernehmen + bevorzugen (aus_vorjahr).
    r = c.post(f"/orgs/{org_id}/vorjahr", headers=_h(token), json={
        "jahr": 2025, "datei_name": "JA2025.pdf",
        "konten": [{"nummer": "4091", "bezeichnung": "Erlöse HKP AOK",
                    "saldo": "184201.44"}],
    })
    assert r.json()["konten"] == 1

    # Logout invalidiert die Sitzung.
    c.post("/auth/logout", headers=_h(token))
    assert c.get("/auth/ich", headers=_h(token)).status_code == 401


def test_seed_demo(client):
    """Der Produktions-Seed läuft durch und liefert einen vollständigen
    Datenbestand (Frontend muss nur noch verbinden)."""
    from app.scripts.seed_demo import seed

    res = seed()
    assert "org_id" in res, res
    assert res["propose"]["neu"] > 100          # 6 Monate Zahlungsverkehr
    assert res["autopilot"]["bestaetigt"] > 50  # Kassen/Gehälter/Regeln laufen

    # Login mit den Seed-Zugängen funktioniert.
    c = client
    r = c.post("/auth/login", json={"email": "inhaberin@sonnenweg.example",
                                    "passwort": "sonnenweg-demo-2026"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    org_id = res["org_id"]
    saldo = c.get(f"/orgs/{org_id}/saldenabgleich", params={"jahr": 2026},
                  headers=_h(token)).json()
    juni = saldo["monate"][5]
    assert juni["tx_count"] > 0 and juni["ok"] is True

    # Kanzlei-Login + Cockpit.
    r = c.post("/auth/login", json={"email": "kanzlei@meyer-kollegen.example",
                                    "passwort": "kanzlei-demo-2026"})
    kt = r.json()["token"]
    r = c.get(f"/kanzlei/{res['kanzlei_org_id']}/cockpit",
              params={"jahr": 2026}, headers=_h(kt))
    assert r.json()["mandate"][0]["rueckfragen_offen"] == 1


def test_cookie_login_und_csv_upload(client):
    """Browser-Weg: Cookie-Auth (ohne Bearer) + Datei-Upload-Endpoint."""
    r = client.post("/auth/registrieren", json={
        "email": "cookie@test.example", "name": "Cookie Test",
        "passwort": "cookie-pass-123",
        "org_name": "Upload GmbH", "org_chart": "skr45",
    })
    assert r.status_code == 200
    org_id = r.json()["org_id"]
    assert "kk_session" in r.cookies  # httpOnly-Cookie gesetzt

    # TestClient hält Cookies — KEIN Authorization-Header noetig.
    ich = client.get("/auth/ich")
    assert ich.status_code == 200
    assert ich.json()["email"] == "cookie@test.example"

    csv_text = (
        "Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
        "03.06.2026;Miete Juni;Hausverwaltung Nord;DE11222233334444555566;-1.850,00;EUR\n"
        "04.06.2026;Telefon;Telekom Deutschland GmbH;DE99888877776666555544;-89,90;EUR\n"
    )
    r = client.post(
        f"/orgs/{org_id}/bank/upload",
        files={"datei": ("umsatz.csv", csv_text.encode("utf-8"), "text/csv")},
    )
    assert r.status_code == 200, r.text
    res = r.json()
    assert res["neu"] == 2
    assert res["vorgeschlagen"] == 2

    # Logout löscht die Session — danach 401.
    client.post("/auth/logout")
    assert client.get("/auth/ich").status_code == 401
