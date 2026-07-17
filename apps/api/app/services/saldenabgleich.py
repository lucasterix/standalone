"""Cent-Anker: beweist je Monat, dass jeder Bankumsatz genau einmal und
betragsrichtig erfasst ist.

Gegenüber FZR eleganter: Bank-Transaktionen liegen in DERSELBEN DB —
der Abgleich ist reine SQL-Aggregation statt API-Paging.
"""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.bank import BankKonto, BankTransaktion
from app.models.fibu import Journal
from app.models.org import Org
from app.services.chart_profile import get_profile

_ERFASST = ("vorgeschlagen", "bestaetigt", "gebucht")


def _q2(d: Decimal) -> str:
    return str(Decimal(d).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def compute(db: Session, org_id: int, jahr: int) -> dict:
    org = db.get(Org, org_id)
    prof = get_profile(org.chart if org else None)
    bank_konten = {
        k.sachkonto for k in db.scalars(
            select(BankKonto).where(BankKonto.org_id == org_id)
        )
    } or {prof.bank}

    # Bank-Wahrheit je Monat.
    tx_rows = db.execute(
        select(
            func.extract("month", BankTransaktion.buchungstag).label("m"),
            func.count().label("n"),
            func.coalesce(func.sum(BankTransaktion.betrag), 0).label("summe"),
        )
        .where(
            BankTransaktion.org_id == org_id,
            func.extract("year", BankTransaktion.buchungstag) == jahr,
        )
        .group_by("m")
    ).all()
    tx_n = {int(r.m): int(r.n) for r in tx_rows}
    tx_s = {int(r.m): Decimal(r.summe) for r in tx_rows}

    # Journal-Seite (vorzeichenrichtig über die Bank-Seite) + Doppelt-Detektor.
    rows = db.execute(
        select(Journal.beleg_datum, Journal.betrag, Journal.soll, Journal.haben,
               Journal.status, Journal.tx_id)
        .where(
            Journal.org_id == org_id, Journal.jahr == jahr,
            Journal.status.in_(_ERFASST), Journal.tx_id.isnot(None),
        )
    ).all()
    j_n: dict[int, int] = {}
    j_s: dict[int, Decimal] = {}
    offen: dict[int, int] = {}
    tx_gesehen: dict[int, int] = {}
    for datum, betrag, soll, haben, status, tx_id in rows:
        m = datum.month
        vz = Decimal("1") if soll in bank_konten else Decimal("-1") if haben in bank_konten else Decimal("0")
        j_n[m] = j_n.get(m, 0) + 1
        j_s[m] = j_s.get(m, Decimal("0")) + vz * (betrag or Decimal("0"))
        if status == "vorgeschlagen":
            offen[m] = offen.get(m, 0) + 1
        tx_gesehen[tx_id] = tx_gesehen.get(tx_id, 0) + 1
    doppelt = sorted(t for t, n in tx_gesehen.items() if n > 1)

    monate = []
    ok_alle = True
    for m in range(1, 13):
        tn, ts = tx_n.get(m, 0), tx_s.get(m, Decimal("0"))
        jn, js = j_n.get(m, 0), j_s.get(m, Decimal("0"))
        ok = tn == jn and abs(ts - js) < Decimal("0.005")
        if (tn or jn) and not ok:
            ok_alle = False
        monate.append({
            "monat": m, "tx_count": tn, "tx_summe": _q2(ts),
            "erfasst_count": jn, "erfasst_summe": _q2(js),
            "offen_count": offen.get(m, 0),
            "diff_count": tn - jn, "diff_summe": _q2(ts - js),
            "ok": ok,
            "datev_bereit": ok and offen.get(m, 0) == 0 and (tn or jn) > 0,
        })
    return {
        "jahr": jahr, "ok": ok_alle,
        "doppelt": doppelt[:50], "doppelt_count": len(doppelt),
        "monate": monate,
    }
