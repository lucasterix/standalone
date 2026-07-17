"""Sessions + Kanzlei-Einladungen."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Session(Base):
    __tablename__ = "session"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Kontext fürs Audit-Log („wo kam die Sitzung her").
    user_agent: Mapped[str | None] = mapped_column(String(200), nullable=True)


class KanzleiEinladung(Base):
    """Kanzlei lädt ein Unternehmen ein (oder umgekehrt) — Einladungslink mit
    Token; bei Annahme entsteht das KanzleiMandat."""

    __tablename__ = "kanzlei_einladung"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kanzlei_org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="offen")  # offen|angenommen|abgelaufen
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
