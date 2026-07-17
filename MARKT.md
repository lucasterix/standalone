# Marktanalyse (Deep-Research, quellengeprüft)

Stand: 2026-07-17 · Methode: Multi-Agent-Recherche, jede Kernaussage von 3 unabhängigen
adversarialen Prüfern gegen Primärquellen verifiziert (Abstimmungen unten je Befund).
Primärquellen wurden heruntergeladen und im Volltext geprüft (PDF-Extraktion), nicht nur
Marketing-Seiten gelesen.

## Kernbefunde

### 1. DATEV automatisiert die Bank-Buchung bereits selbst — aber nur kanzleiseitig ⚠ [3-0]
Der **DATEV Automatisierungsservice Bank** (Launch 08/2024) erzeugt per KI in der
DATEV-Cloud Buchungsvorschläge aus Kontoumsätzen, **lernt aus jeder bestätigten/geänderten
Buchung**, klassifiziert nach Konfidenz (sicher/unsicher/unvollständig) und kann „sichere"
automatisch buchen. Confidence-basiertes Auto-Buchen ist bei DATEV **Produktrealität, nicht
Roadmap**.
→ Quellen: [Produktseite](https://www.datev.de/web/de/loesungen/steuerberater/klassisches-kanzleigeschaeft/buchfuehrung-erstellen/automatisierungsservices/automatisierungsservice-bank/), [DATEV aktuell 03/2024 (PDF)](https://www.datev.de/content/dam/markenassets/themen-und-produktgruppen/zielgruppen/steuerberater/rechnungswesen/datev-aktuell_03-2024_datev_automatisierungservice_bank.pdf)

**Aber — die verifizierten Grenzen (unsere Lücke)** [3-0]:
- Nur im **Kanzlei-Kanal** (elektronisches Bankbuchen in Kanzlei-Rechnungswesen); eine
  Unternehmens-Self-Service-Variante ist laut DATEV aktuell **nicht geplant**.
- Die KI ist nur **Fallback** hinter Lerndatei + OPOS-Suche, „in der Regel bei
  **Sachkontobuchungen**".
- **Kein Cent-genauer Saldenabgleich als Korrektheitsbeweis, kein unternehmensseitiger
  OPOS-Abgleich** im Angebot.

**Adoption** [3-0]: Automatisierungsservice *Rechnungen* massiv (2025: ~7.000 Kanzleien,
100.000+ Bestände, 7,5 Mio. Vorschläge/Monat). Der *Bank*-Service ist jung (Ende 2024:
~3.000 Kanzleien / 18.000 Bestände). **Das Zeitfenster ist offen, schließt sich aber.**

### 2. Die DATEV-API-Anbindung ist KEIN Alleinstellungsmerkmal [3-0]
**Lexware Office** überträgt bereits **echte Buchungssätze + Belege via DATEV
Buchungsdatenservice** (nicht nur CSV). Differenzierung muss aus Vorkontierungsqualität,
Beweisführung (Saldenabgleich) und Nischen-Tiefe kommen — nicht aus der Schnittstelle.
→ [Lexware-Hilfe 9439968](https://help.lexware.de/de-form/articles/9439968)

### 3. Die Pflege-Nische ist verifiziert leer ✅ [3-0, 6 Claims zusammengeführt]
Die Branchensoftware-Anbieter für ambulante Pflege machen **ausschließlich
Leistungsabrechnung mit einseitigem Fibu-Export**:
- **Medifox DAN** (MD Ambulant): kostenträgergerechte Rechnungen + §302/§105-DTA; Fibu nur
  als zukaufbare Export-Schnittstelle (DATEV-Stapelexport). Kein SKR45, keine
  Vorkontierung, kein Bankabgleich.
- **euregon .snap ambulant**: Fibu nur als Zusatzmodul mit Debitorenexport nach dem
  Rechnungslauf. Volltext-Prüfung der Leistungsbeschreibung (Stand 01.10.2024): **0 Treffer**
  für „DATEV", „SKR45", „Kontenrahmen", Bank-/Zahlungsabgleich.
- **opta data**: „AktivService Fibu" überträgt nur eigene Abrechnungsdaten DATEV-kompatibel;
  das einzige echte Fibu-Produkt (CareMan FibuNet) gilt für Rettungsdienste, klassisch, ohne
  lernende Regeln.

**Kein verifizierter Anbieter bietet: lernende Bank-Vorkontierung, OPOS-Bankabgleich oder
SKR45-Fibu-Automatisierung für Pflegedienste.**

### 4. Marktgröße & Nachfragetreiber [je 3-0]
- **15.549 ambulante Pflegedienste** (Pflegestatistik 2023, Destatis, Stichtag 15.12.2023;
  seit 2009 monoton wachsend: 12.026 → 15.549, zuletzt +1,1 %). Stabiler Markt — das
  TAM-Argument läuft über **Automatisierungstiefe pro Kunde**, nicht Marktexpansion.
- **Fachkräftemangel Kanzleien verschärft sich**: STAX 2018: nur 51,8 % der Einzelkanzleien
  konnten alle Stellen besetzen, häufigster Grund „keine geeigneten Bewerber" (75,5 % bei
  Steuerfachwirten/-angestellten). **STAX 2024: nur noch 23,2 %** besetzen alle Stellen
  (Nichtbesetzungsquote 59,1 %). Die BStBK selbst propagiert KI-Fibu-Automatisierung —
  „Steuerberater bleibt im Loop" passt zur Kammer-Linie.

### 5. DATEV-Eintrittsbarrieren — konkret beziffert [3-0]
- API-Onboarding: **einmalig 1.500 € zzgl. USt** (erster Datenservice, inkl. 4 h Beratung),
  weitere Beratung 210 €/h; Go-Live nur nach **Abnahmeprüfung**.
- **Marktplatz-Partnerstatus erst ab 25 aktiven Schnittstellen-Kunden + 3 Referenzen — ohne
  Rechtsanspruch** (individuelle DATEV-Bewertung). Henne-Ei-Problem: erst ohne
  Marktplatz-Sichtbarkeit 25+ Kunden gewinnen.
- **Konsequenz für uns:** Stufe 1 mit **EXTF-Format-Export** (keine Genehmigung nötig, jede
  Kanzlei importiert) validiert; Buchungsdatenservice-Onboarding (~1.500 €) parallel starten.

### 6. Ehrliche Limitation der Recherche [medium]
Die generischen KMU-Wettbewerber **sevdesk, BuchhaltungsButler, Candis, Finmatics** konnten
in der Verifikationsrunde **nicht mit belastbaren Primärquellen-Claims abgedeckt** werden —
insbesondere **BuchhaltungsButler wirbt selbst mit Bank-Vorkontierung** und ist vor
Produktstart einzeln zu prüfen (Testaccount!). Die Lücken-These ist teilweise ein
argumentum ex silentio.

## Synthese: die belegbare Abgrenzung

Unbesetztes Segment = Kombination aus
**(a)** unternehmensseitigem, lernendem Bank-Autopiloten mit vollem OPOS-Abgleich und
Cent-genauem Saldenabgleich (DATEVs KI: kanzleiseitig, Fallback-only, Sachkonten),
**(b)** Pflege-/Kostenträger-Tiefe (SKR45, Sammelavise, § 4 Nr. 16 — verifiziert von keinem
Branchenanbieter bedient),
**(c)** StB-im-Loop via echtem Buchungsstapel (technisch nicht exklusiv, in Kombination
mit a+b aber einzigartig).
