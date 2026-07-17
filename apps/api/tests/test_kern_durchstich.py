"""End-to-End-Durchstich des Fibu-Kerns (ohne HTTP):
CSV-Import → propose-Leiter → Regel lernen → Autopilot → Cent-Anker → EXTF.

Deckt die FZR-Invarianten ab: Idempotenz/Dedup, Kostenträger-Modus,
Lohn-Muster, Fallback nie automatisch, Stapel friert journal_ids ein,
EXTF-Belegfeld-Sanitizing.
"""
from datetime import date
from decimal import Decimal

from app.models.bank import BankKonto
from app.models.fibu import Journal
from app.models.org import Org
from app.services import autopilot, csv_import, extf, kontierung, saldenabgleich
from app.services.history import name_key, norm
from app.models.fibu import Personenkonto

CSV = """Buchungstag;Betrag;Beguenstigter/Zahlungspflichtiger;Verwendungszweck;IBAN Zahlungsbeteiligter
15.06.2026;512,30;DAK-Gesundheit;Sammelavis KW24;DE02300209000106531065
16.06.2026;-1.234,56;Lohnlauf Juni;LOHN GEHALT 06/2026;
17.06.2026;-418,22;Stadtwerke Norden;RG 2026-118;DE12500105170648489890
18.06.2026;-418,22;Stadtwerke Norden;RG 2026-119;DE12500105170648489890
19.06.2026;-418,22;Stadtwerke Norden;RG 2026-120;DE12500105170648489890
20.06.2026;99,00;Voellig Unbekannt;irgendwas;
"""


def _setup(db) -> tuple[int, BankKonto]:
    org = Org(name="Pflegedienst Test GmbH", chart="SKR45",
              datev_berater_nr="1694291", datev_mandant_nr="10357")
    db.add(org)
    db.flush()
    konto = BankKonto(org_id=org.id, name="Bank", sachkonto="1260")
    db.add(konto)
    # Kostenträger DAK als Debitor (Kostenträger-Modus greift dann).
    db.add(Personenkonto(org_id=org.id, typ="debitor", nummer="10002",
                         name="DAK-Gesundheit", name_norm=norm("DAK-Gesundheit"),
                         name_key=name_key("DAK-Gesundheit")))
    db.commit()
    return org.id, konto


def test_durchstich(db):
    org_id, konto = _setup(db)

    # --- CSV-Import + Dedup ------------------------------------------------ #
    r1 = csv_import.import_csv(db, org_id, konto, CSV)
    assert r1 == {"neu": 6, "uebersprungen": 0, "fehler": 0}
    r2 = csv_import.import_csv(db, org_id, konto, CSV)  # Reimport
    assert r2["neu"] == 0 and r2["uebersprungen"] == 6

    # --- propose: die Leiter ------------------------------------------------ #
    stats = kontierung.propose(db, org_id)
    assert stats["neu"] == 6
    assert stats["kostentraeger"] == 1   # DAK → Bank an Debitor
    assert stats["muster"] == 1          # Lohnlauf → 3500
    assert stats["fallback"] == 4        # 3× Stadtwerke + 1× Unbekannt
    # Idempotenz:
    assert kontierung.propose(db, org_id)["neu"] == 0

    dak = db.query(Journal).filter(Journal.partner_nr == "10002").one()
    assert (dak.soll, dak.haben) == ("1260", "10002")
    lohn = db.query(Journal).filter(Journal.origin == "regel").one()
    assert (lohn.soll, lohn.haben) == ("3500", "1260")

    # --- Autopilot (ausgewogen): nur Sicheres, nie Fallback ---------------- #
    ap = autopilot.run(db, org_id)
    assert ap["bestaetigt"] == 2  # DAK + Lohn
    offen = db.query(Journal).filter(Journal.status == "vorgeschlagen").count()
    assert offen == 4

    # --- Mensch entscheidet Stadtwerke 1× + lernt Regel -------------------- #
    sw = db.query(Journal).filter(Journal.partner_name == "Stadtwerke Norden").all()
    assert len(sw) == 3 and all(j.origin == "fallback" for j in sw)
    pk = Personenkonto(org_id=org_id, typ="kreditor", nummer="70001",
                       name="Stadtwerke Norden",
                       name_norm=norm("Stadtwerke Norden"),
                       name_key=name_key("Stadtwerke Norden"))
    db.add(pk)
    db.flush()
    for j in sw:  # Partner nachträglich zuordnen (wie reevaluate)
        j.partner_typ, j.partner_nr = "kreditor", "70001"
    kontierung.lerne_regel(db, org_id, pk.id, "6720")
    sw = db.query(Journal).filter(Journal.partner_nr == "70001").all()
    assert all(j.soll == "6720" and j.origin == "regel" for j in sw)
    # Autopilot räumt sie jetzt ab:
    assert autopilot.run(db, org_id)["bestaetigt"] == 3
    # Der Unbekannte bleibt (Fallback nie automatisch):
    rest = db.query(Journal).filter(Journal.status == "vorgeschlagen").all()
    assert len(rest) == 1 and rest[0].origin == "fallback"

    # --- Cent-Anker --------------------------------------------------------- #
    saldo = saldenabgleich.compute(db, org_id, 2026)
    juni = saldo["monate"][5]
    assert juni["tx_count"] == 6 and juni["erfasst_count"] == 6
    assert juni["ok"] is True and saldo["doppelt_count"] == 0
    assert juni["datev_bereit"] is False  # 1 noch offen

    # Letzten bestätigen → Monat DATEV-bereit.
    rest[0].status = "bestaetigt"
    db.commit()
    saldo = saldenabgleich.compute(db, org_id, 2026)
    assert saldo["monate"][5]["datev_bereit"] is True

    # --- EXTF-Stapel -------------------------------------------------------- #
    stapel = extf.build_stapel(db, org_id, date(2026, 6, 1), date(2026, 6, 30))
    assert stapel.saetze == 6 and len(stapel.journal_ids) == 6
    name, inhalt = extf.extf_bytes(db, stapel)
    text = inhalt.decode("latin-1")
    zeilen = text.strip().split("\r\n")
    assert zeilen[0].startswith('"EXTF";700;21;"Buchungsstapel"')
    assert ";1694291;10357;" in zeilen[0]          # Berater/Mandant
    assert ";20260101;4;20260601;20260630;" in zeilen[0]  # WJ, SKL 4, Periode
    assert '"Umsatz (ohne Soll/Haben-Kz)"' in zeilen[1]
    daten = zeilen[2:]
    assert len(daten) == 6
    # Lohn-Zeile: Betrag mit Komma, S, Konto 3500 an 1260, Belegdatum TTMM.
    lohnzeile = next(z for z in daten if ";3500;1260;" in z)
    assert lohnzeile.startswith('1234,56;"S";"EUR"')
    assert ";1606;" in lohnzeile
    # Kostenträger-Zeile: Bank an Debitor einzeilig.
    assert any(";1260;10002;" in z for z in daten)
    assert stapel.status == "exportiert"

    # --- Übernahme markiert exakt die eingefrorenen Sätze ------------------- #
    assert extf.markiere_uebernommen(db, stapel) == 6
    assert db.query(Journal).filter(Journal.status == "gebucht").count() == 6


def test_autopilot_revert(db):
    org_id, konto = _setup(db)
    csv_import.import_csv(db, org_id, konto, CSV)
    kontierung.propose(db, org_id)
    autopilot.run(db, org_id)
    assert autopilot.revert(db, org_id) == 2
    assert db.query(Journal).filter(Journal.status == "bestaetigt").count() == 0


def test_extf_belegfeld_sanitizing():
    assert extf._belegfeld("RG 2026/118 Müller", 36) == "RG-2026/118-Mueller"
    assert extf._belegfeld("   ", 36) == ""
