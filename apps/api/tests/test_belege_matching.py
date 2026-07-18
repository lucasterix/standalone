"""Beleg-Upload: PDF-Extraktion + Auto-Matching gegen Banktransaktionen."""
from fpdf import FPDF


def _org(client, email, firma):
    r = client.post("/auth/registrieren", json={
        "email": email, "name": "T", "passwort": "passwort-1234",
        "org_name": firma, "org_chart": "skr45",
    })
    return r.json()["org_id"]


def _pdf(text: str) -> bytes:
    p = FPDF()
    p.add_page()
    p.set_font("helvetica", size=11)
    p.multi_cell(0, 8, text)
    return bytes(p.output())


CSV = ("Buchungstag;Verwendungszweck;Name Zahlungsbeteiligter;IBAN;Betrag;Waehrung\n"
       "10.06.2026;RE-777 Material;Sanihaus GmbH;DE11111111111111111111;-240,00;EUR\n"
       "12.06.2026;Tanken;Aral;DE22222222222222222222;-88,20;EUR\n"
       "20.06.2026;Tanken;Aral;DE22222222222222222222;-88,20;EUR\n")


def test_upload_extraktion_und_matching(client):
    org = _org(client, "beleg@test.example", "Beleg GmbH")
    client.patch(f"/orgs/{org}/einstellungen", json={"lohn_muster_aktiv": False})
    client.post(f"/orgs/{org}/bank/upload",
                files={"datei": ("u.csv", CSV.encode(), "text/csv")})

    # 1) Text-PDF mit eindeutigem Betrag -> Extraktion + Auto-Zuordnung
    pdf = _pdf("Sanihaus GmbH\nRechnungs-Nr: SH-2026-777\n"
               "Rechnungsdatum: 08.06.2026\nRechnungsbetrag: 240,00 EUR")
    r = client.post(f"/orgs/{org}/belege/upload",
                    files={"datei": ("re777.pdf", pdf, "application/pdf")})
    assert r.status_code == 200
    b = r.json()
    assert b["betrag"] == "240.00"
    assert b["rechnungs_nr"] == "SH-2026-777"
    assert b["status"] == "zugeordnet" and b["tx"]["name"] == "Sanihaus GmbH"

    # 2) Mehrdeutig (zwei 88,20-Umsaetze, kein Datum nah genug auseinander):
    #    Foto ohne Extraktion, Betrag von Hand -> Kandidatenliste, dann manuell.
    r = client.post(f"/orgs/{org}/belege/upload",
                    data={"betrag": "88,20"},
                    files={"datei": ("foto.png", b"\x89PNG\r\n\x1a\nfake", "image/png")})
    b2 = r.json()
    assert b2["status"] != "zugeordnet" and len(b2["kandidaten"]) == 2
    tx_id = b2["kandidaten"][1]["id"]
    assert client.post(f"/orgs/{org}/belege/{b2['id']}/zuordnen",
                       json={"tx_id": tx_id}).status_code == 200

    # 3) Liste: beide zugeordnet; Datei abrufbar; Journal traegt Beleg-Flag
    liste = client.get(f"/orgs/{org}/belege").json()
    assert all(x["status"] == "zugeordnet" for x in liste)
    d = client.get(f"/orgs/{org}/belege/{b['id']}/datei")
    assert d.status_code == 200 and d.content.startswith(b"%PDF")
    js = client.get(f"/orgs/{org}/journal?suche=Sanihaus").json()
    assert js and js[0]["beleg"] is True
