"""Klärungs-Assistent (Fragen + nachhaltiges Lernen) und Verkauf (Angebot,
Rechnung, OPOS-Kopplung, XRechnung)."""


def _org(client, email, firma):
    r = client.post("/auth/registrieren", json={
        "email": email, "name": "T", "passwort": "passwort-1234",
        "org_name": firma, "org_chart": "skr45",
    })
    assert r.status_code == 200
    return r.json()["org_id"]


CSV = (
    "Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
    "02.06.2026;SV-BEITRAEGE 06/2026;AOK Einzugsstelle;DE87370205000001357913;-8.500,00;EUR\n"
    "03.06.2026;SV-BEITRAEGE 05/2026;AOK Einzugsstelle;DE87370205000001357913;-8.400,00;EUR\n"
    "05.06.2026;Zuzahlung Rechnung 1234;M. Petersen;DE11111111111111111111;120,00;EUR\n"
    "09.06.2026;Zuzahlung Rechnung 1250;M. Petersen;DE11111111111111111111;95,50;EUR\n"
    "11.06.2026;RE-20001 Verbandsmaterial;Sanitaetshaus Foerde GmbH;DE22222222222222222222;-240,00;EUR\n"
    "15.06.2026;RE-20044 Kompressen;Sanitaetshaus Foerde GmbH;DE22222222222222222222;-180,00;EUR\n"
)


def test_assistent_fragen_und_lernen(client):
    org = _org(client, "assist@test.example", "Assistent GmbH")
    client.patch(f"/orgs/{org}/einstellungen", json={"lohn_muster_aktiv": False})
    r = client.post(f"/orgs/{org}/bank/upload",
                    files={"datei": ("u.csv", CSV.encode(), "text/csv")})
    assert r.status_code == 200 and r.json()["auto_gebucht"] == 0

    fragen = client.get(f"/orgs/{org}/assistent/fragen").json()
    typen = {f["typ"] for f in fragen}
    assert typen == {"sv_beitraege", "patient_zuzahlung", "partner_offen"}

    # 1) SV bestätigen → 2 Fälle gebucht auf 3510 + Regel gelernt
    sv = next(f for f in fragen if f["typ"] == "sv_beitraege")
    r = client.post(f"/orgs/{org}/assistent/antwort", json={
        "typ": sv["typ"], "partner_key": sv["partner_key"],
        "journal_ids": sv["journal_ids"], "konto": "3510",
    })
    assert r.json()["gebucht"] == 2
    assert "Regel" in r.json()["gelernt"]

    # 2) Patient bestätigen → Kundenkonto + Buchung auf Personenkonto
    pat = next(f for f in fragen if f["typ"] == "patient_zuzahlung")
    r = client.post(f"/orgs/{org}/assistent/antwort", json={
        "typ": pat["typ"], "partner_key": pat["partner_key"],
        "journal_ids": pat["journal_ids"], "ist_patient": True,
    })
    assert r.json()["gebucht"] == 2
    assert "Kundenkonto" in r.json()["gelernt"]

    # 3) Partner-Frage: Sanitätshaus → 6060 mit Regel
    pa = next(f for f in fragen if f["typ"] == "partner_offen")
    r = client.post(f"/orgs/{org}/assistent/antwort", json={
        "typ": pa["typ"], "partner_key": pa["partner_key"],
        "journal_ids": pa["journal_ids"], "konto": "6060",
    })
    assert r.json()["gebucht"] == 2

    # Nichts mehr offen, keine Fragen mehr; NACHHALTIG: neuer Import
    # desselben Partners bucht automatisch (Regel greift).
    assert client.get(f"/orgs/{org}/assistent/fragen").json() == []
    assert client.get(f"/orgs/{org}/journal?status=vorgeschlagen").json() == []
    csv2 = ("Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
            "20.07.2026;RE-20100 Nachschub;Sanitaetshaus Foerde GmbH;DE22222222222222222222;-99,00;EUR\n"
            "21.07.2026;Zuzahlung Rechnung 1300;M. Petersen;DE11111111111111111111;80,00;EUR\n")
    r = client.post(f"/orgs/{org}/bank/upload",
                    files={"datei": ("u2.csv", csv2.encode(), "text/csv")})
    assert r.json()["auto_gebucht"] == 2  # beide gelernt!


def test_verkauf_angebot_rechnung_xrechnung(client):
    org = _org(client, "verkauf@test.example", "Verkauf GmbH")

    # Angebot
    r = client.post(f"/orgs/{org}/verkauf", json={
        "art": "angebot", "kunde_name": "Stadt Flensburg",
        "positionen": [
            {"bezeichnung": "Pflegeleistung SGB XI", "menge": 10,
             "einzelpreis": 55.0, "ust_satz": 0},
            {"bezeichnung": "Fahrtkosten", "menge": 1,
             "einzelpreis": 40.0, "ust_satz": 19},
        ],
    })
    assert r.status_code == 200
    ang = r.json()
    assert ang["nummer"].startswith("AN-") and ang["summe_brutto"] == "597.60"

    # Angebot → Rechnung (Angebot wird angenommen, OposPosten entsteht)
    r = client.post(f"/orgs/{org}/verkauf", json={
        "art": "rechnung", "kunde_name": "Stadt Flensburg",
        "leitweg_id": "992-90009-96", "angebot_id": ang["id"],
        "positionen": ang["positionen"],
    })
    re_dok = r.json()
    assert re_dok["nummer"].startswith("RE-")
    liste = client.get(f"/orgs/{org}/verkauf").json()
    assert {d["nummer"]: d["status"] for d in liste}[ang["nummer"]] == "angenommen"

    # XRechnung: UBL + EN-16931-Kennung + steuerfreie Kategorie E
    x = client.get(f"/orgs/{org}/verkauf/{re_dok['id']}/xrechnung")
    assert x.status_code == 200
    xml = x.content.decode("utf-8")
    assert "xrechnung_3.0" in xml and "<cbc:ID>380</cbc:ID>" not in xml
    assert "<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>" in xml
    assert "§ 4 Nr. 16 UStG" in xml
    assert "<cbc:PayableAmount currencyID=\"EUR\">597.60</cbc:PayableAmount>" in xml

    # bezahlt → OposPosten schließt mit
    r = client.patch(f"/orgs/{org}/verkauf/{re_dok['id']}/status",
                     json={"status": "bezahlt"})
    assert r.json()["status"] == "bezahlt"


def test_buchungsuebersicht_filter_und_gebucht_schutz(client):
    org = _org(client, "uebersicht@test.example", "Übersicht GmbH")
    client.patch(f"/orgs/{org}/einstellungen", json={"lohn_muster_aktiv": False})
    csv = ("Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
           "05.06.2026;Miete;Vermieter X;DE10101010101010101010;-900,00;EUR\n"
           "09.06.2026;Einnahme Alpha;Kunde Alpha;DE20202020202020202020;500,00;EUR\n")
    client.post(f"/orgs/{org}/bank/upload",
                files={"datei": ("u.csv", csv.encode(), "text/csv")})

    # Filter: Monat + Suche
    juni = client.get(f"/orgs/{org}/journal?jahr=2026&monat=6").json()
    assert len(juni) == 2
    treffer = client.get(f"/orgs/{org}/journal?jahr=2026&suche=Alpha").json()
    assert len(treffer) == 1 and treffer[0]["partner"] == "Kunde Alpha"

    # Beide entscheiden, Konto nachträglich ändern geht (bestaetigt)
    for j in juni:
        client.patch(f"/journal/{j['id']}", json={"status": "bestaetigt"})
    r = client.patch(f"/journal/{juni[0]['id']}", json={"konto": "6310"})
    assert r.status_code == 200

    # Stapel + übernommen → Buchung ist eingefroren (409)
    s = client.post(f"/orgs/{org}/datev/stapel",
                    json={"von": "2026-06-01", "bis": "2026-06-30"}).json()
    client.get(f"/datev/stapel/{s['id']}/extf")
    client.post(f"/datev/stapel/{s['id']}/uebernommen")
    r = client.patch(f"/journal/{juni[0]['id']}", json={"konto": "6320"})
    assert r.status_code == 409
    assert "DATEV" in r.json()["detail"]
