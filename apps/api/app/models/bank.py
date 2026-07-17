"""Bank-Daten IM Produkt (FZR-Lektion: kontoblick als separater Service machte
Saldenabgleich/Coverage umständlich — hier liegen die Transaktionen in
derselben DB wie die Buchhaltung, der Cent-Anker wird EIN SQL-Join).

``betrag`` ist VORZEICHENBEHAFTET (Bank-Wahrheit); das Journal führt Beträge
positiv mit Soll/Haben — die Übersetzung passiert im Kontierungs-Service.
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from decimal import Decimal


class BankKonto(Base):
    __tablename__ = "bank_konto"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="Bank")
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    # Sachkonto dieses Bankkontos (Default aus dem ChartProfile der Org;
    # mehrere Bankkonten → 1261/1262 …).
    sachkonto: Mapped[str] = mapped_column(String(8), nullable=False)
    quelle: Mapped[str] = mapped_column(String(20), nullable=False, default="csv")  # csv|api


class BankTransaktion(Base):
    __tablename__ = "bank_transaktion"
    __table_args__ = (
        # Dedup je Org: CSV-Reimporte und spätere API-Syncs dürfen nie doppeln.
        UniqueConstraint("org_id", "ext_id", name="uq_tx_org_ext"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    konto_id: Mapped[int] = mapped_column(ForeignKey("bank_konto.id"), nullable=False, index=True)

    buchungstag: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    betrag: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)  # signiert!
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    zweck: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    gegen_iban: Mapped[str | None] = mapped_column(String(34), nullable=True)

    # Stabiler externer Schlüssel: API-Tx-Id oder deterministischer CSV-Hash.
    ext_id: Mapped[str] = mapped_column(String(64), nullable=False)
    importiert_am: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
