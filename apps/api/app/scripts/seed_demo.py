"""Produktions-Seed: legt einen kompletten, realistischen Datenbestand an —
exakt das Bild der Frontend-Prototypen, aber als echte Daten.

Angelegt werden:
* Unternehmen „Pflegedienst Sonnenweg GmbH" (SKR45, 200 Konten geseedet)
  mit Inhaberin, Kostenträger-Debitoren, Lieferanten-Kreditoren,
  6 Monaten Bank-Transaktionen (Kassen-Sammelavise, Gehälter, SV, Miete,
  Tanken, Telefon …), propose + Autopilot gelaufen, Rückfrage, Klärungsfall,
  Belege, Vorjahres-Import (Bilanzkontinuität).
* Kanzlei „Steuerkanzlei Meyer & Kollegen" mit Mitarbeiterin + aktivem Mandat.

Deterministisch (fester Seed) und idempotent (bricht ab, wenn die Demo-Org
schon existiert). Aufruf:  python -m app.scripts.seed_demo
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select

import app.models  # noqa: F401
from app.db import Base, SessionLocal, engine
from app.models.bank import BankKonto
from app.models.fach import Beleg, Klaerungsfall, Rueckfrage, RueckfrageNachricht
from app.models.fibu import Journal, OposPosten, Personenkonto
from app.models.org import KanzleiMandat, Org, OrgMember, User
from app.core.security import hash_password
from app.services import autopilot, csv_import, kontierung, vorjahr
from app.services.history import name_key, norm
from app.services.skr_seed import seed_kontenrahmen

DEMO_ORG = "Pflegedienst Sonnenweg GmbH"

KOSTENTRAEGER = [
    ("AOK — Pflegekasse", "DE89370400440532013000", "AOK"),
    ("Techniker Krankenkasse", "DE02120300000000202051", "TK"),
    ("DAK-Gesundheit", "DE02300209000106531065", "DAK"),
    ("BARMER — Pflegekasse", "DE02500105170137075030", "BARMER"),
    ("KKH Pflegekasse", "DE88100900001234567892", "KKH"),
    ("Landkreis Aurich (Sozialamt)", "DE21280501000000012345", None),
]

KREDITOREN = [
    ("Medizinshop Nord GmbH", "6630"),
    ("Textilservice Emden", "6823"),
    ("Stadtwerke Norden", "6720"),
    ("Vermietung Janssen GbR", "7600"),
    ("Telekom Deutschland", "6846"),
    ("Aral Tankstelle Aurich", "6951"),
    ("Knappschaft-Bahn-See (SV)", "3510"),
    ("AOK Einzugsstelle (SV)", "3510"),
]

MITARBEITER = ["L. Rudene", "N. Zander", "A. Liebich", "P. Wijgaerts",
               "M. George", "F. Wehmeier", "B. Ziegner", "S. Koch"]


def _csv_zeilen(rng: random.Random) -> str:
    """6 Monate (Jan–Jun 2026) realistischer Zahlungsverkehr als Bank-CSV."""
    zeilen = ["Buchungstag;Betrag;Beguenstigter/Zahlungspflichtiger;Verwendungszweck;IBAN Zahlungsbeteiligter"]

    def z(d: date, betrag: Decimal, name: str, zweck: str, iban: str = "") -> None:
        b = f"{betrag:.2f}".replace(".", ",")
        zeilen.append(f"{d:%d.%m.%Y};{b};{name};{zweck};{iban}")

    for monat in range(1, 7):
        # Kassen-Sammelavise (Einnahmen) — mehrere je Kasse und Monat.
        for name, iban, _ in KOSTENTRAEGER:
            for k in range(rng.randint(2, 4)):
                tag = date(2026, monat, rng.randint(3, 26))
                betrag = Decimal(rng.randint(80_000, 620_000)) / 100
                z(tag, betrag, name, f"Sammelavis {tag:%m}/2026 Nr.{k + 1}", iban)
        # Selbstzahler.
        for k in range(rng.randint(2, 5)):
            tag = date(2026, monat, rng.randint(2, 27))
            z(tag, Decimal(rng.randint(9_000, 42_000)) / 100,
              f"R. Hartmann {k}", "Rechnung Privatpflege")
        # Gehaltslauf (Sammel) + einzelne Gehälter.
        z(date(2026, monat, 28), Decimal("-59184.00"),
          "Sammelueberweisung", f"LOHN GEHALT {monat:02}/2026")
        for m in MITARBEITER[:3]:
            z(date(2026, monat, 28), -Decimal(rng.randint(210_000, 340_000)) / 100,
              m, f"Gehalt {monat:02}/2026")
        # SV-Beiträge, Miete, Fixkosten, Tanken.
        z(date(2026, monat, 26), Decimal("-8412.60"),
          "Knappschaft-Bahn-See (SV)", "SV-Beitrag")
        z(date(2026, monat, 26), Decimal("-6134.20"),
          "AOK Einzugsstelle (SV)", "SV-Beitrag")
        z(date(2026, monat, 1), Decimal("-2450.00"),
          "Vermietung Janssen GbR", "Miete Buero + Stellplaetze")
        z(date(2026, monat, 5), Decimal("-189.90"),
          "Telekom Deutschland", "Mobilfunk Pflegeteam")
        z(date(2026, monat, 12), Decimal("-418.22"),
          "Stadtwerke Norden", f"Abschlag Strom {monat:02}")
        for k in range(rng.randint(3, 6)):
            z(date(2026, monat, rng.randint(2, 27)),
              -Decimal(rng.randint(4_500, 12_800)) / 100,
              "Aral Tankstelle Aurich", "Tanken Pflegefahrzeug")
        z(date(2026, monat, rng.randint(8, 20)),
          -Decimal(rng.randint(18_000, 46_000)) / 100,
          "Medizinshop Nord GmbH", "Pflegebedarf Bestellung")
        z(date(2026, monat, rng.randint(8, 20)),
          -Decimal(rng.randint(30_000, 52_000)) / 100,
          "Textilservice Emden", "Waescherei")
    return "\n".join(zeilen)


def seed() -> dict:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(Org).where(Org.name == DEMO_ORG)):
            return {"uebersprungen": True, "grund": "Demo-Org existiert bereits"}
        rng = random.Random(2026)

        # --- Nutzer + Orgs ------------------------------------------------- #
        inhaberin = User(email="inhaberin@sonnenweg.example",
                         name="Sabine Weber",
                         password_hash=hash_password("sonnenweg-demo-2026"))
        stb = User(email="kanzlei@meyer-kollegen.example",
                   name="Katrin Meyer",
                   password_hash=hash_password("kanzlei-demo-2026"))
        db.add_all([inhaberin, stb])
        db.flush()

        org = Org(name=DEMO_ORG, art="unternehmen", chart="SKR45",
                  datev_berater_nr="1694291", datev_mandant_nr="10357")
        kanzlei = Org(name="Steuerkanzlei Meyer & Kollegen", art="kanzlei")
        db.add_all([org, kanzlei])
        db.flush()
        db.add_all([
            OrgMember(org_id=org.id, user_id=inhaberin.id, rolle="inhaber"),
            OrgMember(org_id=kanzlei.id, user_id=stb.id, rolle="inhaber"),
            KanzleiMandat(kanzlei_org_id=kanzlei.id,
                          unternehmen_org_id=org.id, status="aktiv"),
        ])
        seed_kontenrahmen(db, org.id, "SKR45")
        konto = BankKonto(org_id=org.id, name="Sparkasse Aurich-Norden",
                          iban="DE21283500000101234567", sachkonto="1260")
        db.add(konto)
        db.flush()

        # --- Vorjahres-Import (Bilanzkontinuität) -------------------------- #
        vorjahr.uebernehmen(db, org.id, 2025, [
            {"nummer": "4091", "bezeichnung": "Erlöse HKP AOK (individuell)", "saldo": "184201.44"},
            {"nummer": "6630", "bezeichnung": "Medizinischer Pflegebedarf", "saldo": "-12480.10"},
            {"nummer": "7600", "bezeichnung": "Miete", "saldo": "-29400.00"},
            {"nummer": "6951", "bezeichnung": "Fahrzeug-Betriebskosten", "saldo": "-8112.55"},
        ], datei_name="JA_2025_Sonnenweg.pdf")

        # --- Personenkonten (deterministische Nummernkreise) --------------- #
        for i, (name, iban, kanon) in enumerate(KOSTENTRAEGER):
            db.add(Personenkonto(
                org_id=org.id, typ="debitor", nummer=str(10000 + i),
                name=name, name_norm=norm(name), name_key=name_key(name),
                iban=iban, kanon=kanon,
            ))
        kred_nr = 70000
        for name, _konto in KREDITOREN:
            db.add(Personenkonto(
                org_id=org.id, typ="kreditor", nummer=str(kred_nr),
                name=name, name_norm=norm(name), name_key=name_key(name),
            ))
            kred_nr += 1
        db.flush()

        # --- Bank-Transaktionen + Kontierung ------------------------------- #
        res_csv = csv_import.import_csv(db, org.id, konto, _csv_zeilen(rng))
        res_prop = kontierung.propose(db, org.id)
        # Lieferanten-Regeln (wie im Onboarding gelernt):
        for name, zielkonto in KREDITOREN:
            pk = db.scalar(select(Personenkonto).where(
                Personenkonto.org_id == org.id,
                Personenkonto.name_norm == norm(name)))
            if pk:
                kontierung.lerne_regel(db, org.id, pk.id, zielkonto,
                                       quelle="onboarding")
        res_ap = autopilot.run(db, org.id)

        # --- OPOS, Klärungsfall, Rückfrage, Belege ------------------------- #
        aok = db.scalar(select(Personenkonto).where(
            Personenkonto.org_id == org.id, Personenkonto.kanon == "AOK"))
        db.add_all([
            OposPosten(org_id=org.id, typ="debitor", personenkonto_id=aok.id,
                       partner_name=aok.name, betrag=Decimal("412.80"),
                       rechnung_nr="R-2026-0611", faellig=date(2026, 7, 10),
                       quelle="abrechnung"),
            Klaerungsfall(org_id=org.id, titel="AOK-Kürzung Sammelavis Juni",
                          betrag=Decimal("96.40"), kostentraeger="AOK",
                          frist=date(2026, 7, 24),
                          notiz="Position M. Brandt gekürzt — Begründung fehlt."),
            Beleg(org_id=org.id, quelle="mail", art="zugferd",
                  absender="rechnung@medizinshop-nord.de",
                  lieferant="Medizinshop Nord GmbH", rechnungs_nr="RE-2026-8841",
                  rechnungs_datum=date(2026, 6, 20),
                  betrag_brutto=Decimal("312.44"), konto_vorschlag="6630",
                  status="zugeordnet"),
            Beleg(org_id=org.id, quelle="upload", art="foto",
                  lieferant="Bäckerei Freud", betrag_brutto=Decimal("38.90"),
                  konto_vorschlag="6880", status="extrahiert"),
        ])
        db.flush()
        # Rückfrage der Kanzlei an einer echten Buchung:
        irgendein_journal = db.scalar(
            select(Journal).where(Journal.org_id == org.id).order_by(Journal.id)
        )
        rf = Rueckfrage(org_id=org.id, journal_id=irgendein_journal.id,
                        created_by=stb.id)
        db.add(rf)
        db.flush()
        db.add(RueckfrageNachricht(
            rueckfrage_id=rf.id, user_id=stb.id,
            text="Ist das eine Erstattung zur SV-Buchung vom 12.06. oder eine Doppelzahlung?",
        ))
        db.commit()
        return {
            "org_id": org.id, "kanzlei_org_id": kanzlei.id,
            "logins": {
                "unternehmen": "inhaberin@sonnenweg.example / sonnenweg-demo-2026",
                "kanzlei": "kanzlei@meyer-kollegen.example / kanzlei-demo-2026",
            },
            "csv": res_csv, "propose": res_prop, "autopilot": res_ap,
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
