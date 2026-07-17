"""Fibu-Kern: Kontenrahmen, Personenkonten, Regeln, Journal, OPOS, Stapel.

Portiert aus dem FZR-Echtbetrieb (>23k Transaktionen), mit den dort teuer
gelernten Invarianten:
* Journal-``betrag`` immer POSITIV, Richtung über Soll/Haben (Bank-Seite).
* ``dedup_key`` unique je Org — Wiederholläufe können nie doppeln.
* Stapel speichert ``journal_ids`` — der Export/Versand betrifft exakt den
  gebauten Bestand, nie „was gerade im Zeitraum liegt".
* ``aus_vorjahr`` am Konto (U0 Jahresabschluss-Import): Bestandskonten werden
  im Vorschlagswesen bevorzugt → Bilanzkontinuität.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SkrKonto(Base):
    __tablename__ = "skr_konto"
    __table_args__ = (UniqueConstraint("org_id", "nummer", name="uq_skr_org_nr"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    nummer: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    bezeichnung: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    art: Mapped[str | None] = mapped_column(String(20), nullable=True)  # aktiv|passiv|aufwand|ertrag
    aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # U0: stammt aus dem hochgeladenen Jahresabschluss → bevorzugen.
    aus_vorjahr: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Personenkonto(Base):
    """Debitor ODER Kreditor (typ) — ein Modell, weil identisches Verhalten."""

    __tablename__ = "personenkonto"
    __table_args__ = (
        UniqueConstraint("org_id", "nummer", name="uq_pk_org_nr"),
        UniqueConstraint("org_id", "typ", "name_norm", name="uq_pk_org_typ_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    typ: Mapped[str] = mapped_column(String(10), nullable=False)  # debitor|kreditor
    nummer: Mapped[str] = mapped_column(String(8), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_norm: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True, default="")
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True, index=True)
    # Kanonischer Kostenträger (Kassen-Bündelung: „AOK", „TK" …), optional.
    kanon: Mapped[str | None] = mapped_column(String(60), nullable=True)


class PartnerRegel(Base):
    __tablename__ = "partner_regel"
    __table_args__ = (UniqueConstraint("org_id", "personenkonto_id", name="uq_regel"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    personenkonto_id: Mapped[int] = mapped_column(ForeignKey("personenkonto.id"), nullable=False)
    konto: Mapped[str] = mapped_column(String(8), nullable=False)
    bu: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quelle: Mapped[str] = mapped_column(String(20), nullable=False, default="manuell")  # manuell|gelernt|onboarding


class Journal(Base):
    __tablename__ = "journal"
    __table_args__ = (UniqueConstraint("org_id", "dedup_key", name="uq_journal_dedup"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    tx_id: Mapped[int | None] = mapped_column(ForeignKey("bank_transaktion.id"), nullable=True, index=True)

    beleg_datum: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    jahr: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    betrag: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)  # POSITIV
    soll: Mapped[str] = mapped_column(String(8), nullable=False)
    haben: Mapped[str] = mapped_column(String(8), nullable=False)
    bu: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    beleg_nr: Mapped[str | None] = mapped_column(String(36), nullable=True)

    partner_typ: Mapped[str | None] = mapped_column(String(10), nullable=True)
    partner_nr: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    partner_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="vorgeschlagen", index=True)
    origin: Mapped[str] = mapped_column(String(20), nullable=False, default="fallback")  # regel|historie|kostentraeger|fallback|manuell
    confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=Decimal("0.40"))
    begruendung: Mapped[str | None] = mapped_column(String(300), nullable=True)
    entschieden_via: Mapped[str | None] = mapped_column(String(20), nullable=True)  # auto|mensch|kanzlei

    dedup_key: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class OposPosten(Base):
    """Offene Posten (Forderungen/Verbindlichkeiten) — P0 minimal; wächst mit
    dem Abrechnungs-Import (A1) zur exakten Sammelavis-Auflösung."""

    __tablename__ = "opos_posten"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    typ: Mapped[str] = mapped_column(String(10), nullable=False)  # debitor|kreditor
    personenkonto_id: Mapped[int | None] = mapped_column(ForeignKey("personenkonto.id"), nullable=True)
    partner_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    betrag: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rechnung_nr: Mapped[str | None] = mapped_column(String(100), nullable=True)
    faellig: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="offen", index=True)
    quelle: Mapped[str] = mapped_column(String(20), nullable=False, default="manuell")


class DatevStapel(Base):
    __tablename__ = "datev_stapel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    von: Mapped[date] = mapped_column(Date, nullable=False)
    bis: Mapped[date] = mapped_column(Date, nullable=False)
    jahr: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="erstellt")  # erstellt|exportiert|uebernommen
    saetze: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    journal_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
