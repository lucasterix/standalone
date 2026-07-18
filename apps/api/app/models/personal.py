"""Personal-Onboarding: Einladungs-Links, die neue Mitarbeitende ausfüllen.

Whitelabel: Das öffentliche Formular läuft unter dem Namen des Betriebs —
Kontoklar taucht dort nicht auf. Einladung + Antwort in EINER Zeile
(der Link IST der Vorgang); Daten als JSON mit serverseitiger
Feld-Whitelist je Variante (kurz|lang).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PersonalEinladung(Base):
    __tablename__ = "personal_einladung"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    variante: Mapped[str] = mapped_column(String(10), nullable=False, default="kurz")  # kurz|lang
    notiz: Mapped[str | None] = mapped_column(String(120), nullable=True)  # z. B. "Frau Petersen, Tourenpflege"

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="offen", index=True)  # offen|ausgefuellt|zurueckgezogen
    daten: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mitarbeiter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ausgefuellt_am: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
