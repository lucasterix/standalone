"""U0 Bilanzkontinuität: Vorjahres-Abschluss übernehmen.

P0: Konten kommen als strukturierte Liste [{nummer, bezeichnung, saldo}]
(z. B. aus SuSa-CSV geparst im Frontend/Import); die KI-Extraktion aus
PDF-Abschlüssen folgt in P1 — Modell + Wirkung sind identisch.

Wirkung: fehlende Konten werden angelegt, alle als ``aus_vorjahr`` markiert
(→ Vorschlags-Ranking bevorzugt Bestandskonten), EB-Salden bleiben am Import
gespeichert (Saldenvortrag bestätigt die Kanzlei).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fach import VorjahresImport
from app.models.fibu import SkrKonto


def uebernehmen(db: Session, org_id: int, jahr: int,
                konten: list[dict], datei_name: str | None = None) -> dict:
    imp = VorjahresImport(org_id=org_id, jahr=jahr, konten=konten,
                          datei_name=datei_name, uebernommen=True)
    db.add(imp)
    vorhanden = {
        k.nummer: k for k in db.scalars(
            select(SkrKonto).where(SkrKonto.org_id == org_id)
        )
    }
    neu = markiert = 0
    for eintrag in konten:
        nummer = str(eintrag.get("nummer", "")).strip()
        if not nummer:
            continue
        k = vorhanden.get(nummer)
        if k is None:
            k = SkrKonto(org_id=org_id, nummer=nummer,
                         bezeichnung=str(eintrag.get("bezeichnung", ""))[:200],
                         aktiv=True, aus_vorjahr=True)
            db.add(k)
            vorhanden[nummer] = k
            neu += 1
        else:
            k.aus_vorjahr = True
            k.aktiv = True
        markiert += 1
    db.commit()
    return {"import_id": imp.id, "konten": markiert, "neu_angelegt": neu}
