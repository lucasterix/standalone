"""Audit-Log (Compliance C2): jede fachliche Entscheidung protokolliert."""
from sqlalchemy.orm import Session

from app.models.fach import AuditLog


def log(db: Session, *, org_id: int | None, user_id: int | None,
        aktion: str, objekt: str | None = None, details: dict | None = None) -> None:
    db.add(AuditLog(org_id=org_id, user_id=user_id, aktion=aktion,
                    objekt=objekt, details=details))
    # Kein eigenes Commit — läuft in der Transaktion der Fachoperation.
