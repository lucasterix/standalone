"""Verkauf: Angebote + Rechnungen (inkl. E-Rechnung).

Ein Modell für beide Dokument-Arten (identische Struktur, anderer
Lebenszyklus). Eine RECHNUNG erzeugt beim Stellen einen OposPosten —
damit schließt sich der Kreis: Rechnung → offener Posten → der
Zahlungsabgleich bucht den Bankeingang automatisch dagegen.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class VerkaufDokument(Base):
    __tablename__ = "verkauf_dokument"
    __table_args__ = (
        UniqueConstraint("org_id", "art", "nummer", name="uq_verkauf_nummer"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    art: Mapped[str] = mapped_column(String(10), nullable=False)  # angebot|rechnung
    nummer: Mapped[str] = mapped_column(String(30), nullable=False)  # AN-2026-0001 / RE-2026-0001

    kunde_name: Mapped[str] = mapped_column(String(255), nullable=False)
    kunde_adresse: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kunde_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    personenkonto_id: Mapped[int | None] = mapped_column(ForeignKey("personenkonto.id"), nullable=True)
    # Leitweg-ID: Pflicht bei XRechnung an Behörden (B2G), sonst leer.
    leitweg_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    datum: Mapped[date] = mapped_column(Date, nullable=False)
    faellig_am: Mapped[date | None] = mapped_column(Date, nullable=True)
    # [{bezeichnung, menge, einheit, einzelpreis, ust_satz}]
    positionen: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    summe_netto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    summe_ust: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    summe_brutto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    # angebot: entwurf|versendet|angenommen|abgelehnt
    # rechnung: offen|bezahlt|storniert
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="entwurf", index=True)
    angebot_id: Mapped[int | None] = mapped_column(ForeignKey("verkauf_dokument.id"), nullable=True)
    opos_id: Mapped[int | None] = mapped_column(ForeignKey("opos_posten.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
