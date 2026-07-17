# Frontend-Design — Plan & System

Stand: 2026-07-17 · lebt mit dem Code in `apps/web/` · Mockups: `docs/mockups/`
(die Demo unter `/demo` **ist** das klickbare Mockup — dieses Dokument erklärt
die Entscheidungen dahinter und plant, was noch fehlt).

---

## 1. Design-Prinzipien (die Messlatte für jede neue Seite)

1. **Beweis vor Behauptung.** Das Produktversprechen ist Korrektheit — also zeigt
   die UI Prüfprotokolle, Begründungen und Herkunfts-Tags, keine Marketing-Ampeln.
   Jede automatische Entscheidung trägt sichtbar ihr „Warum" und ihren Rückweg.
2. **Ruhe als Feature.** Zielgruppe: PDL/Geschäftsführung ohne Fibu-Ausbildung,
   oft abends nach der Tour. Wenige Entscheidungen, große Flächen, warme Töne,
   keine Dashboards-Angeberei. Der Leerlauf („nichts zu tun") ist ein Erfolgs-
   zustand und wird gefeiert („Monat erledigt.").
3. **Zahlen sind heilig.** Alles Monetäre in Tabellenziffern (`.tnum`), Einnahmen
   grün nur wo Richtung gemeint ist, Differenzen niemals verstecken. Geld ein und
   Geld aus werden IMMER getrennt ausgewiesen (nie als Sammelsumme — gelernt aus
   dem FZR-„Summe wirkt zu hoch"-Vorfall).
4. **Fachsprache übersetzen, nicht verstecken.** „Wofür war die Ausgabe?" statt
   „Gegenkonto wählen" — aber Kontonummer und § stehen daneben, denn die Kanzlei
   liest mit. Beide Zielgruppen sehen dieselbe Wahrheit.
5. **Barrierearm per Default.** Fokus-Ringe, echte Buttons/Labels, Kontraste
   ≥ AA, Status nie nur über Farbe (immer Icon + Wort), Motion nur unter
   `prefers-reduced-motion: no-preference`.

## 2. Design-Tokens (implementiert in `app/globals.css`)

| Token-Gruppe | Werte | Rolle |
|---|---|---|
| `brand-50…950` | Petrol (#0d9488-Familie) | Marke, Primäraktionen, Aktiv-Zustände |
| `sand-50…900` | warme Neutrale (#faf9f7 …) | Flächen, Text — bewusst kein kaltes Grau |
| `amber-acc` | #b45309 | Wärme-Akzent: Badges „zur Prüfung", Aufwands-Hinweise |
| `status-good/warn/crit` (+ `-bg`) | grün/amber/rot | NUR Zustände, nie Serienfarben; immer mit Icon+Label |
| `cat-1…4` | #0d9488 · #b45309 · #6d5bd0 · #b8456b | Chart-Serien, feste Reihenfolge — validiert (CVD/Kontrast, light auf #faf9f7; Dark-Set siehe globals-Kommentar) |
| Typo | Fraunces (Display) + Inter (UI) + `.tnum` | Serif = Haltung/Wärme in Headlines; Inter = Arbeit; Ziffern tabellarisch |
| Radius/Schatten | rounded-xl/2xl/3xl, weiche lange Schatten | „freundliche Präzision" |

**Dark Mode:** geplant, nicht v1. Tokens sind vorbereitet (validierte Dark-Palette
dokumentiert); Umsetzung erst nach Pilot-Feedback — Zielgruppe arbeitet tagsüber
im Büro, Light ist der Ernstfall.

## 3. Komponenten-Inventar (implementiert ✅ / geplant ⏳)

- ✅ **Stat-Kachel** (Hero-Zahl + Kontext-Subzeile; good/warn-Varianten)
- ✅ **Cent-Anker-Monatsleiste** (12 Status-Kacheln, Hover-Detail, Jahres-Badge)
- ✅ **Konto-Chip** (Kontonummer · Klartext · Herkunfts-Tag Vorschlag/gelernt/häufig/Erstattung)
- ✅ **Prüf-Karte** (aufklappbar: fixierte Bankseite + Chip-Auswahl + Lern-Checkbox + Buchen)
- ✅ **Grundbuchungs-Auswahl** (Radio-Liste für Erstattungen)
- ✅ **Stapel-Tabelle** (Geld ein/aus getrennt, USt-Zahllast, Aktionen)
- ✅ **Lern-Toast** („Gebucht — Muster gelernt…")
- ✅ **Balken-Chart** 2 Serien gestapelt (2px-Lücken, Basislinie bündig, Tooltip, Legende)
- ✅ **Balkenliste** eine Metrik (ein Farbton, Direktwerte)
- ⏳ **Onboarding-Stepper** (dieser Ausbau — siehe § 5)
- ⏳ **Mobile-Navigation** (Slide-over, dieser Ausbau)
- ⏳ Konto-Suche (Volltext über Kontenrahmen, für „Ändern"-Pfad)
- ⏳ Belegdatei-Viewer (PDF/Foto neben Extraktion)
- ⏳ Kanzlei-Ansicht (Mehr-Mandanten-Cockpit — eigene Rolle, Phase Kanzlei-Kanal)
- ⏳ Klärungsfall-Karte (Kassen-Kürzung aus Sammelavis → Aufgabe)

## 4. Seiten-Inventar & Mockups

| Route | Status | Mockup |
|---|---|---|
| `/` Landing (Hero, Beweis-Band, 3 Schritte, Pflege, Cent-Anker, Kanzlei, Pilot-CTA) | ✅ | `docs/mockups/landing.png` |
| `/demo` Übersicht (Kacheln, Monatsleiste, Aktivität, Kostenträger, Prüfliste-Auszug, Protokoll, DATEV) | ✅ | `docs/mockups/dashboard.png` |
| `/demo/pruefliste` interaktiv | ✅ | `docs/mockups/pruefliste.png`, `…/pruefliste-erstattung.png` |
| `/demo/datev` | ✅ | `docs/mockups/datev.png` |
| `/demo/belege` | ✅ | `docs/mockups/belege.png` |
| `/demo/posten` | ✅ | `docs/mockups/posten.png` |
| `/demo/einstellungen` | ✅ | `docs/mockups/einstellungen.png` |
| `/onboarding` 5-Schritte-Flow | ✅ (dieser Ausbau) | `docs/mockups/onboarding-*.png` |
| Kanzlei-Cockpit | ⏳ nach Pilot | — |
| Klärungsfälle (Kassen-Kürzungen) | ⏳ nach Pilot | — |
| Auth/Billing-Seiten | ⏳ mit echtem Backend | — |

## 5. Der Onboarding-Flow (Design-Spezifikation)

**Ziel-Metrik: < 30 Minuten bis zur ersten automatisch vorkontierten Woche.**
Fünf Schritte, jeder mit einem einzigen Fokus; Fortschritt oben; jeder Schritt
erklärt, WAS gerade passiert und WARUM es sicher ist.

1. **Unternehmen** — Name, Rechtsform, Branche (ambulante Pflege vorausgewählt).
   Sofort sichtbare Konsequenz: „SKR45 + § 4 Nr. 16 werden vorkonfiguriert."
   → Prinzip 4: Konsequenz zeigen statt Formular abfragen.
2. **Bank verbinden** — Institutssuche, Verbindungs-Simulation, Ergebnis:
   „11.234 Umsätze aus 24 Monaten geladen." Vertrauenshinweis (Lesezugriff,
   eigene Zugangsdaten bleiben bei der Bank).
3. **Erkennung** *(der Magic-Moment)* — das System zeigt, was es SELBST
   verstanden hat: X Kostenträger, Y Gehaltsempfänger, Z Lieferanten,
   Wiederkehr-Quote. Nichts zu tun — nur staunen. Erzeugt den „ok, das Ding
   kann was"-Moment vor der ersten Arbeit.
4. **Steuerkanzlei** — Kanzlei benennen (optional, „später" erlaubt),
   Übergabeweg wählen (Entwurf in DATEV / EXTF-Datei). Ton: die Kanzlei ist
   Partnerin, nicht Gegnerin.
5. **Autopilot-Stufe** — Vorsichtig/Ausgewogen/Mutig (Default Ausgewogen) +
   das Sicherheitsversprechen (begründet, protokolliert, umkehrbar).
   Abschluss: „Der Autopilot arbeitet jetzt" → Weiterleitung ins Dashboard.

## 6. Responsive-Strategie

- Landing: mobilfähig ab v1 (einspaltig, Karten stapeln).
- App: **Desktop-first** (Buchhaltung passiert am Schreibtisch), aber
  Mobile-Nav (Slide-over) + stapelbare Karten, damit der „kurz am Handy
  prüfen"-Fall (Prüfliste!) funktioniert. Tabellen scrollen horizontal in
  eigenem Container, nie die Seite.

## 7. Offene Design-Entscheidungen

1. Echter Name + Logo (Arbeitstitel „Kontoklar" — Wortmarke ist bewusst
   austauschbar gehalten, `lib/brand.ts`).
2. Illustrations-Stil: aktuell rein typografisch/kartenbasiert. Option: warme
   Spot-Illustrationen (Pflege-Kontext) für Landing + Empty-States — erst mit
   finaler Marke.
3. Dark Mode (vorbereitet, s. o.).
4. Kanzlei-Cockpit-IA (eigene Nav? eigener Host?) — nach ersten
   Kanzlei-Gesprächen.
