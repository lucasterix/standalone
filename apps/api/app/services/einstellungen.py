"""Einstellungen des Buchungsalgorithmus — lazy angelegt, immer vorhanden.

Der Algorithmus (kontierung/autopilot) liest AUSSCHLIESSLICH über
``fuer_org``; Defaults leben im Modell. So gibt es genau eine Wahrheit
und Bestands-Orgs bekommen beim ersten Zugriff automatisch eine Zeile.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.org import OrgEinstellung


def fuer_org(db: Session, org_id: int) -> OrgEinstellung:
    est = db.scalar(
        select(OrgEinstellung).where(OrgEinstellung.org_id == org_id)
    )
    if est is None:
        est = OrgEinstellung(org_id=org_id)
        db.add(est)
        db.flush()
    return est
