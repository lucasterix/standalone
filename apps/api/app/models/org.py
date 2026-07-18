"""Tenancy: Organisationen (Unternehmen ODER Kanzlei), Nutzer, Mitgliedschaften.

Gelernt aus FZR: Mandantentrennung von Anfang an als Fremdschlüssel auf
JEDER Fachtabelle (org_id), nie als nachgerüsteter String. Eine Kanzlei ist
selbst eine Org (art="kanzlei") und betreut Unternehmens-Orgs über
``KanzleiMandat`` — dieselben Fachdaten, zwei Sichten.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Org(Base):
    __tablename__ = "org"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    art: Mapped[str] = mapped_column(String(20), nullable=False, default="unternehmen")  # unternehmen|kanzlei

    # Fachliche Konfiguration (Unternehmen): Kontenrahmen-Profil + DATEV-Ziel.
    chart: Mapped[str] = mapped_column(String(10), nullable=False, default="SKR45")
    datev_berater_nr: Mapped[str | None] = mapped_column(String(10), nullable=True)
    datev_mandant_nr: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Autopilot-Stufe: vorsichtig | ausgewogen | mutig (siehe autopilot-Service).
    autopilot_stufe: Mapped[str] = mapped_column(String(20), nullable=False, default="ausgewogen")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class OrgEinstellung(Base):
    """Einstellungen des Buchungsalgorithmus (1:1 zur Org, lazy angelegt).

    Eigene Tabelle statt Org-Spalten: create_all legt sie auf Bestands-
    Systemen einfach an (kein ALTER TABLE noetig, solange es kein Alembic gibt).
    """

    __tablename__ = "org_einstellung"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, unique=True)
    # Nach N gleichen Bestaetigungen Partner->Konto bucht der Autopilot selbst.
    lern_schwelle: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    # Einnahme von bekanntem Debitor => Bank an Personenkonto (Pflege-Kern).
    kostentraeger_modus: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Lohn/Gehalt-Textmuster auf das Lohn-Verbindlichkeitskonto.
    lohn_muster_aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Ziel unerkannter Umsaetze (nur Vorschlag, NIE automatisch); leer = ChartProfile.
    fallback_erloes: Mapped[str | None] = mapped_column(String(8), nullable=True)
    fallback_aufwand: Mapped[str | None] = mapped_column(String(8), nullable=True)


class User(Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class OrgMember(Base):
    """Wer darf in welcher Org was (Rollen: inhaber | buchhaltung | kanzlei)."""

    __tablename__ = "org_member"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_member"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_user.id"), nullable=False, index=True)
    rolle: Mapped[str] = mapped_column(String(20), nullable=False, default="inhaber")


class KanzleiMandat(Base):
    """Betreuungsverhältnis Kanzlei-Org → Unternehmens-Org (max. eine Kanzlei
    je Unternehmen; Einladung in beide Richtungen)."""

    __tablename__ = "kanzlei_mandat"
    __table_args__ = (
        UniqueConstraint("unternehmen_org_id", name="uq_mandat_unternehmen"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kanzlei_org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    unternehmen_org_id: Mapped[int] = mapped_column(ForeignKey("org.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="aktiv")  # eingeladen|aktiv|beendet
    aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
