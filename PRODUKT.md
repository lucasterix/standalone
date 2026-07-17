# Produkt-Verbesserungen — Backlog & Kanzleimodus-Spezifikation

Stand: 2026-07-17 · ergänzt PLAN.md (Bau-Phasen) und DESIGN.md (Gestaltung).
Priorisierung: **W** = Wirkung auf Kauf-/Bleibe-Entscheidung, **A** = Aufwand
(je 1–3, ▲ hoch / ● mittel / ▽ niedrig).

---

## 1. Kanzleimodus (das zweite Gesicht des Produkts) — Spezifikation

**Warum zuerst:** Der Kanzlei-Kanal ist laut Marktanalyse der stärkste Vertrieb
(1 Vertrag = zig Mandate; STAX 2024: nur 23 % der Einzelkanzleien bekommen alle
Stellen besetzt). Der Kanzleimodus macht aus dem Endkunden-Tool eine
**Zuarbeiter-Flotte** für die Kanzlei.

### 1a. Rollenmodell
| Rolle | Sieht | Darf |
|---|---|---|
| Unternehmer:in | eigenen Mandanten | Prüfliste entscheiden, Belege, Einstellungen |
| Mitarbeiter:in Buchhaltung (optional) | eigenen Mandanten | wie oben, ohne Einstellungen |
| **Kanzlei-Mitarbeiter:in** | alle zugeordneten Mandate | lesen, Rückfragen stellen, Stapel abrufen |
| **Kanzlei-Admin** | alle Mandate der Kanzlei | + Mandanten einladen, Rechte, Abrechnung |

Ein Mandant kann von GENAU EINER Kanzlei betreut werden; die Einladung läuft in
beide Richtungen (Kanzlei lädt Mandant / Mandant verknüpft Kanzlei).

### 1b. Kanzlei-Cockpit (Kernscreen, Prototyp: `/kanzlei`)
- **KPI-Zeile:** Mandate gesamt · davon Monat grün (Cent-Anker) · Stapel
  abholbereit · offene Rückfragen.
- **Mandanten-Tabelle** (die Arbeitsfläche): je Mandat Monats-Status
  (✓ Cent-genau / Δ Differenz / ⏳ läuft), offene Prüfpunkte des Unternehmers,
  Stapel-Status (bereit / gesendet / übernommen), letzte Aktivität, Aktionen
  (Stapel abrufen · Mandat öffnen · Rückfrage).
- **Sortierung nach Handlungsbedarf**, nicht alphabetisch: rot > Stapel bereit >
  Rest. Ziel-Metrik: *„Der Monatsabschluss aller Pflege-Mandate an einem
  Vormittag."*
- **Mandats-Drilldown** = dieselbe App wie beim Unternehmer (eine Wahrheit,
  keine Zweitansicht), plus Kanzlei-Leiste (Rückfrage stellen, Konto
  umkontieren mit Begründung → trainiert den Autopiloten des Mandanten).

### 1c. Rückfragen-Kanal (der E-Mail-Ping-Pong-Killer)
Kanzlei markiert eine Buchung → „Rückfrage" mit Freitext + Vorschlag →
erscheint beim Unternehmer als Prüflisten-Karte („Ihre Kanzlei fragt: …") →
Antwort fließt zurück und trainiert den Autopiloten. Beide Seiten sehen den
Verlauf an der Buchung — nie wieder „siehe meine Mail vom 3."

### 1d. Weitere Kanzlei-Bausteine
| Baustein | W | A | Notiz |
|---|---|---|---|
| Sammel-Stapelabruf („alle bereiten Stapel als Entwurf senden") | 3 | ▽ | ein Klick statt n |
| Mandanten-Einladungslink mit vorbelegtem Onboarding | 3 | ● | DER Wachstumshebel: Kanzlei rollt aus |
| DATEV-Mandantennummer-Mapping je Mandat | 3 | ▽ | Bridge-Routing existiert schon (FZR Phase 4) |
| Kanzlei-Branding light (Logo im Mandanten-Login) | 2 | ▽ | „powered by" bleibt |
| Kanzlei-Abrechnung (Staffelpreis, eine Rechnung) | 3 | ● | Reseller-Modell |
| Team-Rechte (wer sieht welche Mandate) | 2 | ● | ab ~5 Kanzlei-Nutzern nötig |

---

## 1½. Painpoint-Analyse (aus eigenem Betrieb + Kanzlei-Perspektive)

### Unternehmer:innen (Pflege/Sozialwirtschaft)
| Painpoint | Heute | Unsere Antwort |
|---|---|---|
| **Kassen kürzen Posten aus Sammelavisen** — Absetzungen gehen im Sammelbetrag unter, Widerspruchsfristen verstreichen | Excel/Bauchgefühl | U1 Klärungsfälle mit Frist + Vorlage |
| **Lange Zahlungsziele der Träger** (Sozialämter 30–60 Tage) → Liquiditätslücke trotz voller Auftragsbücher | Kontoblick + Hoffnung | U4 Liquiditäts-Blick aus Zahlverhalten je Träger |
| **E-Rechnung**: Empfangs-PFLICHT seit 01.01.2025 für alle B2B — viele Dienste haben kein System und drucken XRechnungen aus (unlesbar); Versandpflicht folgt 2027/2028 | ausdrucken/ignorieren | Beleg-Postfach liest XRechnung/ZUGFeRD strukturiert (A2) — Pflicht wird zum Vorteil |
| **BWA kommt Monate später** — Steuerung im Blindflug, Lohn = 70 % der Kosten | Warten auf Kanzlei | Echtzeit-Zahlen, weil täglich gebucht wird |
| Beleg-Chaos (Tankquittungen, Kartenzahlungen) → GoBD-Risiko + Kanzlei-Rückfragen | Schuhkarton | U2 Beleg-Nachfass |
| USt-Unsicherheit bei Zusatzleistungen (Essen, Kiosk, hauswirtschaftl. Extras) | „machen wir wie immer" | U6 Assistent |
| Investitionskosten-Abgrenzung (§ 82 SGB XI) & Verwendungsnachweise bei Zuschüssen | Jahresend-Panik | Konten-Templates + C3-Protokolle |
| **Jahresabschluss-Bruch**: neue Software/neue Kanzlei ⇒ andere Konten als im Vorjahr, Bilanzkontinuität leidet | manuell abtippen | **U0 Jahresabschluss-Import (s. u.)** |

### Kanzleien
| Painpoint | Heute | Unsere Antwort |
|---|---|---|
| Fachkräftemangel: Buchungsarbeit frisst die knappen Fachkräfte | Überstunden/Ablehnung von Mandaten | Cockpit + fertige Stapel |
| Pendelordner & späte Lieferung → UStVA-Fristen-Stress | Mahnen per Mail | tägliche Buchung, Stapel „bereit" statt „bring mal" |
| Rückfragen-Ping-Pong per Mail, Kontext geht verloren | Outlook | 1c Rückfragen-Kanal an der Buchung |
| **Mandatsübernahme: Vorjahres-Kontenwelt unbekannt**, EB-Werte mühsam, Kontenbrüche in der Bilanz | SuSa abtippen | **U0: Abschluss hochladen ⇒ Kontenrahmen + EB-Vorträge stehen** |
| Pflege-Spezifika (SKR45, Kostenträger, § 4 Nr. 16) nicht im Team-Wissen | Vermeidung von Pflege-Mandaten | Branchenlogik steckt im System |
| Haftungsangst bei Automatik | Alles selbst buchen | Cent-Anker-Protokoll + Entwurfs-Prinzip + C1 Verfahrensdoku |

## 1¾. U0 — Jahresabschluss-Import (Bilanzkontinuität) **[W3 · A●]**

**Idee (Daniel):** Abschluss/SuSa der Vorjahre hochladen → die dort bebuchten
**Bestandskonten werden übernommen und im Vorschlagswesen bevorzugt** —
die Bilanz bleibt kontinuierlich lesbar, für Kanzlei UND Betriebsprüfung.

Mechanik:
1. **Upload**: Jahresabschluss-PDF (Kontennachweis!), Summen-/Saldenliste
   (CSV/PDF) oder E-Bilanz (XBRL) — beliebige Vorjahre, auch mehrere.
2. **Extraktion**: Kontenliste (Nummer, Bezeichnung, Saldo) per Struktur/KI;
   Erkennung des Kontenrahmens (SKR03/04/45!) inkl. „krummer" Individualkonten.
3. **Wirkung**:
   - Konten werden als *bestätigt-verwendet* markiert ⇒ Vorschlags-Ranking
     bevorzugt sie VOR generischen Standardkonten („eher verwenden").
   - Individualkonten (z. B. 4091 „Erlöse HKP AOK") bleiben erhalten statt
     auf Standard gemappt zu werden.
   - **EB-Werte** als Eröffnungsbilanz-Vorschlag (Saldenvortrag prüfbar,
     Kanzlei bestätigt) — Anschluss an die Schlussbilanz gesichert.
   - Abweichungs-Warnung: „Konto 6820 war im Vorjahr 12 T€ — dieses Jahr
     noch nie bebucht. Absicht?" (Kontinuitäts-Wächter).
4. **Onboarding-Platz**: eigener optionaler Schritt „Vorjahr" (Prototyp
   umgesetzt) — überspringbar, Wirkung im Erkennungs-Schritt sichtbar
   („78 Bestandskonten aus Ihrem Abschluss 2025 übernommen").

## 2. Verbesserungs-Backlog Unternehmer-Seite

| # | Verbesserung | W | A | Kern |
|---|---|---|---|---|
| U1 | **Klärungsfälle** (Kassen-Kürzungen): gekürzte Sammelavis-Posten werden Aufgaben mit Frist + Widerspruchs-Vorlage | 3 | ● | verlorenes Geld sichtbar machen — Pflege-Alltagsschmerz Nr. 1 |
| U2 | **Beleg-Nachfass**: „Zur Kartenzahlung vom 24.06. fehlt der Beleg" als sanfte Wochenliste (Mail/Push) | 3 | ▽ | GoBD + weniger Kanzlei-Rückfragen |
| U3 | **Monats-Digest** (Mail zum 1.): „737 Umsätze, 97 % automatisch, Monat Cent-genau, 4 Minuten für Sie" | 2 | ▽ | Ruhe-Versprechen erlebbar, Retention |
| U4 | **Liquiditäts-Blick**: erwartete Kassen-Zahlungen (aus offenen Posten + Zahlverhalten je Träger) vs. Fixkosten | 2 | ● | „reicht es bis zum 15.?" — CFO-Frage der PDL |
| U5 | Jahresabschluss-Paket: Saldenlisten, OPOS-Listen, Protokolle als ZIP für die Kanzlei | 2 | ▽ | Januar-Schmerz |
| U6 | USt-Sonderfall-Assistent (Kiosk/Essen/49-€-Grenzen) | 1 | ● | selten, aber teuer wenn falsch |
| U7 | Mehrbanken + Kasse (Bar-Einlagen sauber) | 2 | ● | größere Dienste |

## 3. Vertrauen & Compliance (kaufentscheidend im StB-Umfeld)

| # | Baustein | W | A |
|---|---|---|---|
| C1 | **Verfahrensdokumentation-Generator** (GoBD): aus den tatsächlichen Einstellungen/Regeln automatisch erzeugt, versioniert | 3 | ● |
| C2 | Unveränderliches Audit-Log (wer/was/wann, exportierbar) | 3 | ▽ |
| C3 | Cent-Anker-Prüfprotokoll als PDF je Monat (für BP/Kanzlei-Akte) | 2 | ▽ |
| C4 | AVV/TOMs-Center + EU-Hosting-Nachweis | 2 | ▽ |

## 4. Automatisierungstiefe (der Burggraben, aus FZR bekannt)

| # | Baustein | W | A |
|---|---|---|---|
| A1 | **Abrechnungs-Import** (opta data zuerst, dann Medifox/DMRZ): Forderungen je Klient/Träger → Sammelavis-Split wird exakt statt heuristisch | 3 | ▲ |
| A2 | E-Rechnungs-Empfang (XRechnung/ZUGFeRD) strukturiert | 3 | ● |
| A3 | Netzwerk-Lernen (anonymisierte Partner-Kontierung über Mandanten hinweg) | 3 | ▲ |
| A4 | Lohn-Schnittstelle (DATEV LODAS/LuG-Buchungsbeleg statt Muster) | 2 | ▲ |

## 5. Empfohlene Reihenfolge (nach Pilot-Start)

1. **Kanzleimodus-Cockpit + Rückfragen** (Prototyp jetzt, echt in P1) — öffnet den Vertriebskanal.
2. **U1 Klärungsfälle + U2 Beleg-Nachfass** — die zwei fühlbarsten Alltags-Gewinne.
3. **C1–C3 Compliance-Paket** — räumt die Kanzlei-Einwände ab.
4. **A1 Abrechnungs-Import** — macht die Nische uneinholbar.
5. U3/U4 Digest + Liquidität — Retention & Begeisterung.

*Prototyp-Status: `/kanzlei` (Cockpit mit Beispiel-Mandaten + Rückfragen-Idee)
ist als klickbares Mockup umgesetzt — siehe `docs/mockups/kanzlei.png`.*
