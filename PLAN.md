# Standalone: Fibu-Autopilot als SaaS — Projektplan

Stand: 2026-07-17 · Autor: Claude (Analyse-Session mit Daniel) · Status: **Planung, vor Bau-Start**

> **Die Idee in einem Satz:** Die Buchhaltungs-Automatik, die wir für Fröhlich (ambulanter
> Pflegedienst, SKR45) und SSR (Handel, SKR04) gebaut haben — Bank rein, lernende
> Vorkontierung, Autopilot, Cent-genauer Korrektheitsbeweis, fertiger DATEV-Stapel raus —
> als eigenständiges Produkt für fremde Unternehmen.

---

## 1. Was wir haben (Asset-Inventur aus dem FZR-Repo)

In ~3 Wochen Echtbetrieb entstanden und **an >23.000 echten Banktransaktionen zweier
Firmen bewiesen** (11.856 Fröhlich-Umsätze: Prüfliste auf 3.147 reduziert, 8.717
automatisch gebucht; Saldenabgleich 4× Cent-genau grün):

### 1a. Direkt übernehmbar (Kern-IP, ~80 % wiederverwendbar)

| Asset | Was es kann | SaaS-Wert |
|---|---|---|
| **Kontierungs-Engine** (propose-Ladder) | Gesellschafter → OPOS-Match → Partner-Regel → Kategorie-Mapping → gelernte Historie (≥3 Bestätigungen ⇒ auto) → Fallback; Konfidenz-Stufen 0.90/0.75/0.40 | Das Herz. Generisch gebaut, firmen-agnostisch |
| **Autopilot** | Bestätigt nur sichere Herkünfte automatisch, alles markiert (`decided_via=auto`), 1-Klick-Rückweg (`revert_auto`), Not-Aus je Firma | „Autonomie mit Rückweg" — genau die Vertrauensmechanik, die ein SaaS braucht |
| **Saldenabgleich (Cent-Anker)** | Je Monat: Bank-Wahrheit (Anzahl + Summe) vs. Buchungen, Doppelbuchungs-Detektor, `datev_bereit`-Signal | **Der USP-Kandidat.** Kein uns bekannter Wettbewerber *beweist* Vollständigkeit. Fand am ersten Tag einen echten Fehler (Zahlung im falschen WJ) |
| **ChartProfile** | Kontenrahmen-Abstraktion (SKR04/SKR45): Bank-Konto, Fallbacks, BU-Defaults, Klassen, Kostenträger-Modus je Profil | Exakt die Abstraktion für Multi-Tenant; SKR03 etc. sind ein Config-Eintrag |
| **Kostenträger-Modus** | Einnahmen bekannter Debitoren → „Bank an Debitor" (Personenkonto), Erlös entsteht aus der Rechnung | Fachlich korrekt für JEDES Forderungsgeschäft (Pflege, Ärzte, Agenturen, Handwerk) |
| **DATEV-Stapel-Pipeline** | Offline-Validierung (Perioden-Regel, 0-€-Guard), Belegfeld-Sanitizing, technische Kontenlänge 8/9-stellig, journal_ids-Kopplung, Perioden-Supersede, lesbare REW-Fehler-Zusammenfassung, Mandanten-Routing mit Echo-Pflicht | Monate an schmerzhaft erarbeitetem DATEV-Detailwissen (REW00799, REW01154, …) — teuer zu reproduzieren |
| **OPOS-Modul** | Offene Posten, Zahlungs-Matching (Betrag+Name+RgNr), zweistufige Personenkonto-Buchung | Standard-Baustein, funktioniert |
| **Partner-Discovery** | Debitoren/Kreditoren aus Umsätzen ableiten, Krankenkassen-Kanonisierung, `name_key`-Fuzzy (zerrissene Banknamen!), Dubletten-Merge | Onboarding-Beschleuniger: „Bank verbinden → Kontenplan steht" |
| **Beleg-Pipeline** | Mail-Postfach → KI-Extraktion → Eingangsrechnung + OPOS + Bank-Match (Zahlung aufs Bankdatum) | Basis für E-Rechnungs-Pflicht (s. 3.) |
| **Review-UX** | Coverage-Monatskarten mit Ampeln, Prüfliste, KontoVorschlagPicker (Bank fixiert, smarte Chips, Storno-Verlinkung, BU-Codes, „Als Regel merken") | Konzept übernehmen, Politur nötig |

### 1b. Learnings (kein Code, aber der eigentliche Vorsprung)

1. **Der Engpass ist nie das Erkennen, sondern das Bestätigen** → Autopilot für sichere
   Herkünfte, Prüfliste nur für echte Entscheidungen. (11.856 → 3.147 in einem Tag.)
2. **Korrektheit muss bewiesen, nicht behauptet werden** → Saldenabgleich als Produkt-DNA.
   Vertrauen ist im Fibu-Markt DIE Kaufhürde.
3. **Pauschale Erlöskonten sind falsch** bei Kostenträger-Geschäft → Personenkonten-Weg.
   Wettbewerber, die „KI rät ein Konto" machen, buchen hier systematisch falsch.
4. DATEV-Praxis-Fallen: technische Kontenlänge, Belegfeld-Zeichensatz, Automatikkonto vs.
   BU-Schlüssel, § 4 Nr. 16/§ 15 Abs. 2 (Pflege bucht brutto!), Zahlungs- ≠ Rechnungsdatum,
   ein Stapel = eine Periode, is_committed=false als Kontrollpunkt für den StB.
5. **Banken zerreißen Namen** („D ie Gesu ndheitskas.f") → Kanonisierung + Fuzzy-Keys sind
   Pflicht, sonst bleibt die Hälfte liegen.
6. Idempotenz-Disziplin (dedup_keys, Advisory-Locks, force-Semantik) macht die Pipeline
   wiederholbar — Grundvoraussetzung für einen Betrieb ohne Support-Feuerwehr.

### 1c. NICHT übernehmen (Fröhlich-/FZR-spezifisch)

Patti-Integration, Fachaufsicht/Schul-Flows, Lohn/HR/PHM, Mobile-App, Admin-Vermischung
mit dem restlichen FZR-Betrieb — und vor allem: die **on-prem-Bridge-Architektur**
(DATEVconnect lokal auf Daniels RW-PC via Tailscale). Die funktioniert für uns selbst,
skaliert aber nicht auf fremde Kunden (s. 2a).

---

## 2. Was umgedacht werden muss

### 2a. DATEV-Zugang (die wichtigste Architektur-Entscheidung)
- **Heute:** eigener RW-PC + DATEVconnect on-premise. Für Kunden nicht reproduzierbar.
- **SaaS-Weg, Stufe 1 (sofort, ohne Gatekeeper):** Export im **DATEV-Format (EXTF-CSV
  Buchungsstapel)** — jede Kanzlei kann das in Rechnungswesen importieren. Unser
  AccountingSequence-Modell konvertiert 1:1; neu zu schreiben ist nur der
  EXTF-Serializer (überschaubar, Format ist dokumentiert).
- **Stufe 2 (Moat):** **DATEVconnect online / Buchungsdatenservice** über das
  DATEV-Entwickler-/Marktplatz-Programm — echter API-Durchstich je Kunde (OAuth), wie
  wir ihn heute on-prem haben. Dauer/Kosten der Partnerschaft: siehe Marktanalyse (§ 4).
- Learnings (Sanitizing, Kontenlänge, Fehlercodes) gelten für beide Wege.

### 2b. Bank-Anbindung
kontoblick nutzt EnableBanking + CSV-Import. Als SaaS brauchen wir einen kommerziellen
**PSD2-Aggregator** (finAPI [gehört DATEV!], GoCardless Bank Account Data, Tink,
EnableBanking-Kommerzlizenz) — Kostenfaktor je Konto/Monat, in die Preise einkalkulieren.
CSV-Import als Fallback behalten (unsere Parser existieren).

### 2c. Mandantenfähigkeit & Sicherheit
- Aus 2 hartkodierten Firmen (`company`-Spalte — Grundmuster existiert!) wird echtes
  Tenancy: Orgs, User, Rollen (Unternehmer / Buchhalter / Steuerberater-Gast), Billing
  (Stripe), AVV/DSGVO, EU-Hosting, Audit-Log.
- ChartProfile wird DB-Konfiguration statt Code-Konstante.
- **Lern-Daten strikt tenant-isoliert** — aber anonymisiertes **Netzwerk-Lernen** über
  kanonisierte Partner (die 1.000ste Firma erbt Kontierungswissen aus 999 Historien:
  „Telekom → 6805/6846" muss niemand mehr beibringen) ist der langfristige Daten-Moat.
- KI-Beleg-Extraktion: EU-Hosting (Bedrock/Vertex EU), Kosten pro Beleg ins Pricing.

### 2d. UX & Onboarding
Unser Review-Tab ist Power-User-Werkzeug. Das SaaS braucht: „Bank verbinden → 10
Onboarding-Fragen (Rechtsform, Kontenrahmen, Branche) → Discovery legt Personenkonten an
→ Autopilot startet konservativ". Ziel-Metrik: **< 30 Minuten bis zur ersten
automatisch vorkontierten Woche.**

### 2e. Go-to-Market-Umdenken
Wir haben für UNS gebaut (der Unternehmer prüft selbst). Es gibt zwei Käufer:
1. **Selbstbuchende KMU** (direkter Ersatz unserer eigenen Nutzung),
2. **Steuerkanzleien** (Mehr-Mandanten-Cockpit: „Autopilot für die vorbereitende
   Buchhaltung Ihrer Mandanten") — vermutlich der stärkere Kanal: Fachkräftemangel,
   ein Vertrag = zig Mandate, und der StB bleibt ohnehin unser Kontrollpunkt
   (is_committed=false-Philosophie passt exakt).

---

## 3. Was weiterentwickelt werden muss (Produkt-Roadmap-Themen)

1. **E-Rechnung** (Empfangspflicht seit 2025, Versandpflicht bis 2028): strukturierte
   XRechnung/ZUGFeRD-Belege sind für unsere Pipeline EINFACHER als PDF-OCR — eingebauter
   Markt-Rückenwind, muss aber gebaut werden.
2. **Pflege-Modul (Nischen-Power):** Import der Leistungsabrechnung (opta data, Medifox
   DAN, DMRZ, euregon …) als OPOS-Forderungen → der Erlös-Loop schließt sich komplett:
   Abrechnung → Forderung je Kostenträger → Sammelzahlungs-Split (unsere Avis-Logik!) →
   Cent-genauer Abschluss. **Das kann heute niemand am Markt** (Abrechnungs-Anbieter
   machen keine Fibu, Fibu-Anbieter kennen keine Kostenträger-Sammelavise).
3. USt-Voranmeldungs-Vorbereitung + BWA-light (Kontoblick-Analytics-Erbe).
4. Kanzlei-Cockpit (Mehr-Mandanten-Übersicht, Ampeln je Mandant, Stapel-Sammelversand).

---

## 4. Marktanalyse

*(Deep-Research, jede Aussage 3-fach adversarial gegen Primärquellen verifiziert —
Details + Quellen in [`MARKT.md`](MARKT.md). Kernaussagen:)*

1. **DATEV macht lernende Bank-Vorkontierung inzwischen selbst** (Automatisierungsservice
   Bank, seit 08/2024, Konfidenz-basiertes Auto-Buchen) — **aber nur im Kanzlei-Kanal**,
   KI nur als Fallback hinter Lerndatei/OPOS, primär Sachkonten, **kein Saldenabgleich,
   kein Unternehmens-Self-Service (laut DATEV nicht geplant)**. Adoption noch jung
   (~3.000 Kanzleien Ende 2024) → **Zeitfenster offen, schließt sich**.
2. **Die DATEV-API-Anbindung allein differenziert nicht mehr** — Lexware Office pusht
   bereits echte Buchungsstapel via Buchungsdatenservice.
3. **Die Pflege-Nische ist verifiziert leer**: Medifox DAN, euregon, opta data machen nur
   Leistungsabrechnung + Fibu-Export (Volltext-geprüft: 0× DATEV/SKR45/Bankabgleich bei
   euregon). Niemand bietet lernende Vorkontierung/OPOS-Bankabgleich für Pflegedienste.
4. **Markt**: 15.549 ambulante Dienste (Destatis 2023, stabil +1,1 %); Kanzlei-
   Fachkräftemangel verschärft sich massiv (STAX 2024: nur 23,2 % der Einzelkanzleien
   besetzen alle Stellen) — Nachfrage-Rückenwind für „StB bleibt im Loop"-Automatisierung.
5. **DATEV-Eintritt beziffert**: API-Onboarding ~1.500 € + Abnahme; Marktplatz erst ab
   25 aktiven Kunden (ohne Rechtsanspruch) → bestätigt unsere EXTF-zuerst-Strategie.
6. **Ehrliche Lücke der Recherche**: sevdesk/BuchhaltungsButler/Candis/Finmatics konnten
   nicht primärquellen-fest verifiziert werden — **BuchhaltungsButler wirbt selbst mit
   Bank-Vorkontierung** → vor Baustart per Testaccount prüfen (P0-Aufgabe).

---

## 5. Positionierung & Abgrenzung

**Nicht** „das bessere lexoffice" (Rechnungsschreiben + Buchhaltung für alle) — dieser
Markt ist besetzt und preisgetrieben. Sondern:

> **„Der Fibu-Autopilot mit Korrektheitsbeweis"** — zuerst für **ambulante Pflegedienste
> und Sozialwirtschaft** (SKR45, Kostenträger-Zahlungen, § 4 Nr. 16), dann für
> Kostenträger-/Forderungsgeschäft generell; verkauft an Unternehmen UND als
> Mehr-Mandanten-Werkzeug an Steuerkanzleien mit Pflege-Mandaten.

Abgrenzungs-Trias:
1. **Beweis statt Versprechen:** Cent-genauer Saldenabgleich als sichtbares Produkt-Feature
   („Ihr Juni stimmt auf den Cent — hier ist der Beweis").
2. **Branchen-Tiefe:** SKR45-Vorlagen, Kassen-Kanonisierung, Sammelavis-Split,
   Brutto-Buchung § 4 Nr. 16 — Dinge, die generische Tools systematisch falsch machen.
3. **StB-freundlich statt StB-feindlich:** prüfbare Entwurfs-Stapel ins echte DATEV
   (nicht CSV-Müll, nicht „Kanzlei überflüssig"-Rhetorik) → Kanzleien werden Kanal,
   nicht Gegner.

## 6. Chancen-Einschätzung (ehrlich)

| Szenario | Einschätzung |
|---|---|
| Generisches KMU-Fibu-SaaS | **< 10 %** — lexoffice/sevdesk + **DATEV automatisiert die Bank jetzt selbst** (wenn auch kanzleiseitig); ohne Bestand, Marke, Kapital nicht gewinnbar |
| **Nische Pflege/Sozialwirtschaft, Kanzlei-Kanal** | **~ 40–50 %** auf ein tragfähiges Produkt (Ziel: 50–100 zahlende Mandanten / >100 k€ ARR in 24 Monaten) — Lücke verifiziert leer, Schmerz belegbar, wir sind selbst Referenzkunde. Leicht gesenkt ggü. Bauchgefühl wegen des sich schließenden Zeitfensters (DATEV-Bank-Service skaliert im Kanzlei-Kanal) → **Tempo ist Teil der Strategie** |

Was die Chance trägt: bewiesene Technik an >23k echten Transaktionen, Domänen-Wissen aus
dem eigenen Pflegebetrieb, Fröhlich+SSR als lebende Referenzen (Dogfooding: FZR-Fibu
läuft künftig AUF dem Produkt → eine Codebasis, jede Verbesserung doppelt genutzt).

Was sie killen kann (Top-Risiken):
1. **DATEV-Gatekeeping** (Partnerschaft verzögert/verweigert) → Gegenmittel: EXTF-Export
   ab Tag 1, API als Stufe 2.
2. **Vertrieb an konservative Zielgruppe** (Pflegedienste kaufen langsam) → Kanzlei-Kanal
   + Famora-Netzwerk als Pilotquelle.
3. **Team-Kapazität** (Famora hat viele Baustellen) → P0/P1 bewusst klein geschnitten.
4. **Haftungs-Wahrnehmung** („Wer haftet bei Fehlbuchung?") → Autopilot bestätigt nur
   Sicheres, StB bleibt Kontrollpunkt, AGB sauber ziehen.
5. Wettbewerber-Reaktion (Finmatics/Candis im Kanzlei-Segment) → Nischen-Tiefe als Schutz.

## 7. Roadmap

- **P0 — Extraktion (4–6 Wochen):** Kern-Services (Engine, OPOS, Saldenabgleich,
  Stapel-Builder, ChartProfile, Discovery) aus FZR in dieses Repo, FZR-Spezifika raus,
  echtes Tenancy-Modell, kontoblick-Kern einverleiben (ein Service). Stack bleibt
  FastAPI/Postgres/Next.js (Team-Kompetenz).
- **P1 — Pilot-MVP (8–12 Wochen):** Bank via Aggregator, EXTF-Export, Onboarding-Flow,
  3–5 Pilot-Pflegedienste aus dem Famora-/Fröhlich-Netzwerk + 1–2 Kanzleien;
  Fröhlich & SSR migrieren als Tenant 1+2 (Dogfooding).
- **P2 — Durchstich & Pflicht (Q+2):** DATEV-Marktplatz-Antrag parallel ab P0!,
  Buchungsdatenservice-Integration, E-Rechnungs-Empfang, Abrechnungs-Import (opta data
  zuerst — Fröhlich nutzt es selbst).
- **P3 — Skalierung:** Kanzlei-Cockpit, Netzwerk-Lernen, Pricing-Staffeln
  (Richtwert: 99–249 €/Monat je Mandant Pflege; Kanzlei-Staffelpreise).

## 8. Offene Entscheidungen (Daniel)

1. Firmierung/Trennung: eigenes Vehikel oder unter Famora? (Haftung, DATEV-Vertrag, AVV)
2. Name & Domain (Arbeitstitel „standalone").
3. Budget-Rahmen P0/P1 (v. a. Aggregator-Vertrag + EU-KI-Hosting).
4. Pilot-Kandidaten: welche 3–5 befreundeten Pflegedienste / welche Kanzlei zuerst?
5. DATEV-Partnerprogramm: sofort beantragen (Vorlauf!) — wer ist Ansprechpartner?
