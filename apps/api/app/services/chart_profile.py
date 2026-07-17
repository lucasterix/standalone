"""Kontenrahmen-Profil je Org — EINE Quelle für kontenrahmen-abhängige Konten.

Direkt-Port aus dem FZR-Echtbetrieb (dort an SKR04 + SKR45 bewiesen), inkl.
Längen-Guard (Personenkonten sind nie Erfolgskonten — „70010"[:1] wäre in
SKR45-Klasse 7 sonst ein falscher Treffer).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ChartProfile:
    chart: str
    bank: str
    geldtransit: str
    ust_vorauszahlung: str
    fallback_erloes: str
    fallback_aufwand: str
    bu_default_ausgabe: int | None
    bu_default_einnahme: int | None
    aufwand_klassen: tuple[str, ...]
    ertrag_klassen: tuple[str, ...]
    lohn_verbindlichkeit: str | None = None
    lohnsteuer: str | None = None
    sozialversicherung: str | None = None
    einnahme_auf_personenkonto: bool = False
    debitor_start: int = 10000
    kreditor_start: int = 70000
    # DATEV-Sachkontenlänge (EXTF-Header) — wir führen kurz.
    sachkonto_laenge: int = 4

    @property
    def erfolgsklassen(self) -> tuple[str, ...]:
        return self.aufwand_klassen + self.ertrag_klassen

    def ist_erfolgskonto(self, konto: str | None) -> bool:
        return bool(konto) and len(konto) <= 4 and konto[:1] in self.erfolgsklassen

    def richtung(self, soll: str | None, haben: str | None, bank: str | None = None) -> str:
        b = bank or self.bank
        if soll == b:
            return "einnahme"
        if haben == b:
            return "ausgabe"
        return "neutral"


SKR04 = ChartProfile(
    chart="SKR04", bank="1800", geldtransit="1460", ust_vorauszahlung="3820",
    fallback_erloes="4400", fallback_aufwand="6300",
    bu_default_ausgabe=9, bu_default_einnahme=3,
    aufwand_klassen=("5", "6"), ertrag_klassen=("4",),
)

# Pflege/Sozialwirtschaft: § 4 Nr. 16 UStG steuerfrei, kein VSt-Abzug → brutto.
SKR45 = ChartProfile(
    chart="SKR45", bank="1260", geldtransit="1695", ust_vorauszahlung="3640",
    fallback_erloes="5500", fallback_aufwand="6840",
    bu_default_ausgabe=None, bu_default_einnahme=None,
    aufwand_klassen=("6", "7"), ertrag_klassen=("4", "5"),
    lohn_verbindlichkeit="3500", lohnsteuer="3504", sozialversicherung="3510",
    einnahme_auf_personenkonto=True,
)

PROFILES = {"SKR04": SKR04, "SKR45": SKR45}


def get_profile(chart: str | None) -> ChartProfile:
    return PROFILES.get((chart or "").strip().upper(), SKR45)
