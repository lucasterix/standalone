"""Fach-Entitäten auf Produktionsniveau: Belege, Rückfragen, Klärungsfälle,
Vorjahres-Import (Bilanzkontinuität), Audit-Log.

Spiegeln 1:1 die Frontend-Prototypen (Belege-Inbox, Rückfragen-Kanal des
Kanzlei-Cockpits, Klärungsfälle aus PRODUKT.md U1, Onboarding-Schritt
„Vorjahr") — die API muss später nur noch verbunden werden.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Beleg(Base):
    """Eingangsbeleg (Mail-Postfach, Upload, E-Rechnung)."""

    __tablename__ = "beleg"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    quelle: Mapped[str] = mapped_column(String(20), nullable=False, default="upload")  # mail|upload|erechnung
    art: Mapped[str] = mapped_column(String(20), nullable=False, default="pdf")  # pdf|foto|xrechnung|zugferd
    datei_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    absender: Mapped[str | None] = mapped_column(String(255), nullable=True)

    lieferant: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rechnungs_nr: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rechnungs_datum: Mapped[date | None] = mapped_column(Date, nullable=True)
    betrag_brutto: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    konto_vorschlag: Mapped[str | None] = mapped_column(String(8), nullable=True)
    extraktion: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Roh-Extraktion (KI/strukturiert)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="neu", index=True)
    # neu | extrahiert | zugeordnet | verbucht | verworfen
    tx_id: Mapped[int | None] = mapped_column(ForeignKey("bank_transaktion.id"), nullable=True)
    journal_id: Mapped[int | None] = mapped_column(ForeignKey("journal.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Rueckfrage(Base):
    """Kanzlei ↔ Unternehmer, hängt an einer Buchung (nie wieder Mail-Ping-Pong)."""

    __tablename__ = "rueckfrage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    journal_id: Mapped[int] = mapped_column(ForeignKey("journal.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="offen", index=True)  # offen|beantwortet|geschlossen
    created_by: Mapped[int] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class RueckfrageNachricht(Base):
    __tablename__ = "rueckfrage_nachricht"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rueckfrage_id: Mapped[int] = mapped_column(ForeignKey("rueckfrage.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Optionaler Konto-Vorschlag der Kanzlei („so umkontieren?").
    konto_vorschlag: Mapped[str | None] = mapped_column(String(8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Klaerungsfall(Base):
    """Kassen-Kürzung/Absetzung aus einem Sammelavis (PRODUKT.md U1):
    verlorenes Geld sichtbar machen, mit Frist."""

    __tablename__ = "klaerungsfall"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    posten_id: Mapped[int | None] = mapped_column(ForeignKey("opos_posten.id"), nullable=True)
    tx_id: Mapped[int | None] = mapped_column(ForeignKey("bank_transaktion.id"), nullable=True)
    titel: Mapped[str] = mapped_column(String(200), nullable=False)
    betrag: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    kostentraeger: Mapped[str | None] = mapped_column(String(120), nullable=True)
    frist: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="offen", index=True)
    # offen | widerspruch | erledigt | abgeschrieben
    notiz: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class VorjahresImport(Base):
    """U0 Bilanzkontinuität: hochgeladener Jahresabschluss/SuSa eines Vorjahres.
    ``konten`` = extrahierte Liste [{nummer, bezeichnung, saldo}] — die Übernahme
    markiert SkrKonto.aus_vorjahr und legt fehlende Konten an."""

    __tablename__ = "vorjahres_import"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    jahr: Mapped[int] = mapped_column(Integer, nullable=False)
    datei_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    konten: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    uebernommen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    """Unveränderliches Protokoll (Compliance C2): wer hat wann was getan."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int | None] = mapped_column(ForeignKey("org.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    aktion: Mapped[str] = mapped_column(String(60), nullable=False)   # z. B. journal.bestaetigt
    objekt: Mapped[str | None] = mapped_column(String(60), nullable=True)  # z. B. journal:123
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
