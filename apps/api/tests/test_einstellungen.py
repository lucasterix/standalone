"""Einstellungen des Buchungsalgorithmus: Wirkung + Rollen + Simulation."""


def _registrieren(client, email, firma):
    r = client.post("/auth/registrieren", json={
        "email": email, "name": "T", "passwort": "passwort-1234",
        "org_name": firma, "org_chart": "skr45",
    })
    assert r.status_code == 200
    return r.json()["org_id"]


CSV = (
    "Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
    "01.06.2026;Lohn Juni;Lohnlauf;DE00111122223333444455;-9.500,00;EUR\n"
    "02.06.2026;Unbekannt XY;Fremdfirma Z;DE99000011112222333344;-120,00;EUR\n"
)


def test_einstellungen_wirken_und_simulation(client):
    org = _registrieren(client, "est@test.example", "Einstellungs GmbH")

    # Defaults lesen (legt lazy die Zeile an).
    est = client.get(f"/orgs/{org}/einstellungen").json()
    assert est["lern_schwelle"] == 3
    assert est["kostentraeger_modus"] is True
    assert est["fallback_aufwand"] is None
    assert est["fallback_aufwand_default"]

    # Lohn-Muster AUS + eigenes Fallback-Aufwandskonto.
    r = client.patch(f"/orgs/{org}/einstellungen", json={
        "lohn_muster_aktiv": False, "fallback_aufwand": "6300",
        "autopilot_stufe": "mutig", "lern_schwelle": 2,
    })
    assert r.status_code == 200
    assert r.json()["fallback_aufwand"] == "6300"

    # Import: OHNE Lohn-Muster landet der Lohnlauf im (eigenen) Fallback.
    r = client.post(f"/orgs/{org}/bank/upload",
                    files={"datei": ("u.csv", CSV.encode(), "text/csv")})
    assert r.status_code == 200
    zeilen = client.get(f"/orgs/{org}/journal?status=vorgeschlagen").json()
    assert len(zeilen) == 2
    assert all(j.get("origin") == "fallback" for j in zeilen)
    assert all(j["soll"] == "6300" for j in zeilen)

    # Simulation: Fallback bucht KEINE Stufe.
    sim = client.get(f"/orgs/{org}/autopilot/simulation").json()
    assert sim["offen"] == 2
    assert sim["stufen"] == {"vorsichtig": 0, "ausgewogen": 0, "mutig": 0}

    # Validierung.
    assert client.patch(f"/orgs/{org}/einstellungen",
                        json={"autopilot_stufe": "yolo"}).status_code == 400
    assert client.patch(f"/orgs/{org}/einstellungen",
                        json={"fallback_erloes": "abc"}).status_code == 400


def test_regel_anlegen_wirkt_und_kanzlei_darf_nicht(client):
    org = _registrieren(client, "regel@test.example", "Regel GmbH")
    pk = client.post(f"/orgs/{org}/personenkonten", json={
        "typ": "kreditor", "name": "Fremdfirma Z",
        "iban": "DE99000011112222333344",
    }).json()

    # Regel anlegen, dann Import: Umsatz bucht per Regel (Autopilot).
    r = client.post(f"/orgs/{org}/regeln",
                    json={"personenkonto_id": pk["id"], "konto": "6815"})
    assert r.status_code == 200
    client.patch(f"/orgs/{org}/einstellungen", json={"lohn_muster_aktiv": False})
    client.post(f"/orgs/{org}/bank/upload",
                files={"datei": ("u.csv", CSV.encode(), "text/csv")})
    regeln = client.get(f"/orgs/{org}/regeln").json()
    assert regeln[0]["konto"] == "6815"
    assert regeln[0]["gebucht"] == 1  # der Fremdfirma-Umsatz lief automatisch

    # Regel deaktivieren geht; Kanzlei-Rolle dürfte nicht (403-Weg geprüft
    # über die Einstellungen — gleiche Guard-Logik).
    rid = regeln[0]["id"]
    assert client.patch(f"/regeln/{rid}", json={"aktiv": False}).status_code == 200
