"""Personal-Onboarding: Link erstellen → öffentlich ausfüllen → Org liest."""


def _org(client, email, firma):
    r = client.post("/auth/registrieren", json={
        "email": email, "name": "T", "passwort": "passwort-1234",
        "org_name": firma, "org_chart": "skr45",
    })
    return r.json()["org_id"]


def test_personal_kurz_und_lang(client):
    org = _org(client, "hr@test.example", "HR GmbH")

    kurz = client.post(f"/orgs/{org}/personal/einladungen",
                       json={"variante": "kurz", "notiz": "Tourenpflege"}).json()
    lang = client.post(f"/orgs/{org}/personal/einladungen",
                       json={"variante": "lang"}).json()
    assert kurz["status"] == "offen" and len(kurz["token"]) > 20

    # Öffentlich (OHNE Session): Whitelabel-Infos + Feldliste je Variante
    offen = client.get(f"/personal/formular/{kurz['token']}",
                       headers={"Authorization": ""})
    assert offen.status_code == 200
    f = offen.json()
    assert f["firma"] == "HR GmbH"
    assert "sv_nummer" in f["felder"] and "konfession" not in f["felder"]
    flang = client.get(f"/personal/formular/{lang['token']}").json()
    assert "konfession" in flang["felder"]

    # Absenden: Whitelist filtert fremde Felder; Konfession fliegt bei KURZ raus
    r = client.post(f"/personal/formular/{kurz['token']}", json={"daten": {
        "vorname": "Mia", "nachname": "Petersen",
        "iban": "DE00 1234", "konfession": "ev", "hack": "x",
    }})
    assert r.status_code == 200
    liste = client.get(f"/orgs/{org}/personal/einladungen").json()
    fertig = next(e for e in liste if e["id"] == kurz["id"])
    assert fertig["status"] == "ausgefuellt"
    assert fertig["mitarbeiter_name"] == "Mia Petersen"
    assert "konfession" not in fertig["daten"] and "hack" not in fertig["daten"]

    # Doppelt absenden -> 409; Pflichtfelder -> 400; falscher Token -> 404
    assert client.post(f"/personal/formular/{kurz['token']}",
                       json={"daten": {"vorname": "X", "nachname": "Y"}}).status_code == 409
    assert client.post(f"/personal/formular/{lang['token']}",
                       json={"daten": {"vorname": "Nur"}}).status_code == 400
    assert client.get("/personal/formular/gibtsnicht").status_code == 404

    # Zurückziehen macht den Link tot
    client.post(f"/orgs/{org}/personal/einladungen/{lang['id']}/zurueckziehen")
    assert client.get(f"/personal/formular/{lang['token']}").status_code == 404


def test_exporte_csv_und_pdf(client):
    org = _org(client, "export@test.example", "Export GmbH")

    # Personalbogen ausfüllen
    e = client.post(f"/orgs/{org}/personal/einladungen",
                    json={"variante": "kurz"}).json()
    client.post(f"/personal/formular/{e['token']}", json={"daten": {
        "vorname": "Ömer", "nachname": "Müller-Lüdenscheidt",
        "iban": "DE00 1234", "krankenkasse": "TK",
    }})

    # Einzel-PDF + Einzel-CSV + Sammel-CSV
    pdf = client.get(f"/orgs/{org}/personal/einladungen/{e['id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF") and len(pdf.content) > 900
    csv1 = client.get(f"/orgs/{org}/personal/einladungen/{e['id']}/csv")
    text = csv1.content.decode("utf-8-sig")
    assert "Müller-Lüdenscheidt" in text and "Krankenkasse" in text
    assert client.get(f"/orgs/{org}/personal/export.csv").status_code == 200

    # Buchungsjournal CSV + PDF (mit Filter)
    client.patch(f"/orgs/{org}/einstellungen", json={"lohn_muster_aktiv": False})
    csv_bank = ("Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
                "05.06.2026;Miete;Vermieter;DE10101010101010101010;-800,00;EUR\n"
                "09.06.2026;Erlös;Kunde;DE20202020202020202020;300,50;EUR\n")
    client.post(f"/orgs/{org}/bank/upload",
                files={"datei": ("u.csv", csv_bank.encode(), "text/csv")})
    jc = client.get(f"/orgs/{org}/journal/export.csv?jahr=2026&monat=6")
    jt = jc.content.decode("utf-8-sig")
    assert "Buchungstext" in jt and "300,50" in jt and jt.count("\r\n") >= 3
    jp = client.get(f"/orgs/{org}/journal/export.pdf?jahr=2026&monat=6")
    assert jp.status_code == 200 and jp.content.startswith(b"%PDF")
