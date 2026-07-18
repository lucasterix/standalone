"""PSD2-Bankverbindung (EnableBanking) — eine je Org (MVP)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BankVerbindung(Base):
    __tablename__ = "bank_verbindung"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="getrennt")
    # getrennt | wartet | aktiv | abgelaufen
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    account_uid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    account_iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    gueltig_bis: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    letzter_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
