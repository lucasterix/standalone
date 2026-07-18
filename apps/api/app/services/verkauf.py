"""Verkauf: Nummernkreise, Summen, XRechnung (EN 16931 / UBL 2.1).

E-Rechnung ehrlich umgesetzt: Wir erzeugen eine XRechnung-konforme
UBL-Invoice-XML (das seit 2025 gesetzlich anerkannte strukturierte
Format) — kein „PDF mit Logo". Die Druckansicht fürs Papier liefert
das Frontend. § 4 Nr. 16 UStG (Pflege): steuerfreie Positionen mit
ust_satz 0 und Steuerbefreiungs-Vermerk.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from xml.sax.saxutils import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.fibu import OposPosten
from app.models.org import Org
from app.models.verkauf import VerkaufDokument

_PREFIX = {"angebot": "AN", "rechnung": "RE"}


def naechste_nummer(db: Session, org_id: int, art: str, jahr: int) -> str:
    muster = f"{_PREFIX[art]}-{jahr}-%"
    n = db.scalar(
        select(func.count(VerkaufDokument.id)).where(
            VerkaufDokument.org_id == org_id,
            VerkaufDokument.art == art,
            VerkaufDokument.nummer.like(muster),
        )
    ) or 0
    return f"{_PREFIX[art]}-{jahr}-{n + 1:04d}"


def summen(positionen: list[dict]) -> tuple[Decimal, Decimal, Decimal]:
    netto = ust = Decimal("0")
    for p in positionen:
        menge = Decimal(str(p.get("menge", 1)))
        preis = Decimal(str(p.get("einzelpreis", 0)))
        satz = Decimal(str(p.get("ust_satz", 0)))
        zeile = (menge * preis).quantize(Decimal("0.01"), ROUND_HALF_UP)
        netto += zeile
        ust += (zeile * satz / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return netto, ust, netto + ust


def rechnung_stellen(db: Session, dok: VerkaufDokument) -> OposPosten:
    """Rechnung → offener Posten; der Zahlungsabgleich matcht Bankeingänge."""
    posten = OposPosten(
        org_id=dok.org_id, typ="debitor",
        personenkonto_id=dok.personenkonto_id,
        partner_name=dok.kunde_name, betrag=dok.summe_brutto,
        rechnung_nr=dok.nummer, faellig=dok.faellig_am,
        status="offen", quelle="rechnung",
    )
    db.add(posten)
    db.flush()
    dok.opos_id = posten.id
    return posten


def xrechnung_xml(org: Org, dok: VerkaufDokument, *,
                  verkaeufer_iban: str | None = None) -> bytes:
    """UBL-2.1-Invoice nach EN 16931 (CIUS XRechnung 3.0)."""
    e = escape
    zeilen = []
    ust_gruppen: dict[str, Decimal] = {}
    for i, p in enumerate(dok.positionen, start=1):
        menge = Decimal(str(p.get("menge", 1)))
        preis = Decimal(str(p.get("einzelpreis", 0)))
        satz = Decimal(str(p.get("ust_satz", 0)))
        zeile_netto = (menge * preis).quantize(Decimal("0.01"), ROUND_HALF_UP)
        kat = "E" if satz == 0 else "S"
        ust_gruppen.setdefault(f"{kat}|{satz}", Decimal("0"))
        ust_gruppen[f"{kat}|{satz}"] += zeile_netto
        zeilen.append(f"""
  <cac:InvoiceLine>
    <cbc:ID>{i}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="{e(str(p.get('einheit') or 'C62'))}">{menge}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">{zeile_netto}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>{e(str(p.get('bezeichnung', 'Leistung')))}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>{kat}</cbc:ID>
        <cbc:Percent>{satz}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">{preis}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>""")

    subtotals = []
    for schluessel, basis in ust_gruppen.items():
        kat, satz = schluessel.split("|")
        betrag = (basis * Decimal(satz) / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
        befreiung = (
            "<cbc:TaxExemptionReason>Steuerfreie Pflegeleistung "
            "nach § 4 Nr. 16 UStG</cbc:TaxExemptionReason>"
            if kat == "E" else ""
        )
        subtotals.append(f"""
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">{basis}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">{betrag}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>{kat}</cbc:ID>
        <cbc:Percent>{satz}</cbc:Percent>{befreiung}
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>""")

    leitweg = e(dok.leitweg_id or f"{dok.nummer}@{(dok.kunde_email or 'rechnung@kunde.de')}")
    zahlung = ""
    if verkaeufer_iban:
        zahlung = f"""
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount><cbc:ID>{e(verkaeufer_iban)}</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>"""

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>{e(dok.nummer)}</cbc:ID>
  <cbc:IssueDate>{dok.datum.isoformat()}</cbc:IssueDate>
  <cbc:DueDate>{(dok.faellig_am or dok.datum).isoformat()}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>{leitweg}</cbc:BuyerReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>{e(org.name)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyLegalEntity><cbc:RegistrationName>{e(org.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>{e(dok.kunde_name)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyLegalEntity><cbc:RegistrationName>{e(dok.kunde_name)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>{zahlung}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">{dok.summe_ust}</cbc:TaxAmount>{''.join(subtotals)}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">{dok.summe_netto}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">{dok.summe_netto}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">{dok.summe_brutto}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">{dok.summe_brutto}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>{''.join(zeilen)}
</Invoice>
"""
    return xml.encode("utf-8")
