# Bento 2.0 — verbindliche Design-Spec (Redesign aller Seiten)

Daniels Wahl: **Variante C „Bento"** (`apps/web/app/design/c/page.tsx` = Referenz-Look,
Screenshot `docs/mockups/design-c.png`). Diese Spec ist die einzige Wahrheit —
alle Seiten benutzen die Bausteine aus `globals.css`, keine Insellösungen.

## Bausteine (in globals.css definiert)

| Klasse | Zweck |
|---|---|
| `tile` | weiße Bento-Kachel, 28px-Radius, weicher Schatten |
| `tile-mint` / `tile-apricot` / `tile-lavender` / `tile-rose` | Pastell-Kachel (mit `tile` kombinieren: `className="tile tile-mint"`) |
| `tile-hero` | Petrol-Gradient-Kachel (weiße Schrift) — max. EINE pro Seite |
| `zahl-hero` | große Zahl: ExtraBold, eng, immer tabellarisch |
| `knopf knopf-primaer` / `knopf-hell` / `knopf-kontur` | Pillen-Buttons (immer `rounded-full`-Look, py-2.5 bis py-3, px-5/6) |
| `chip chip-apricot` / `chip-mint` | Zähler-/Status-Pillen |
| `zeile-soft` | Listenzeile in Kachel (#f7f5f1, 16px-Radius) |

Tint-Tiefton-Textfarben: `text-tile-mint-ink`, `text-tile-apricot-ink`,
`text-tile-lavender-ink`, `text-tile-rose-ink`, `text-tile-mint-deep` (grüne Zahl).
Fläche: `bg-bento-bg` (#f5f3ef). Grundtext: `text-ink` / `text-ink-soft`.

## Layout-Muster
- Seiten = **Bento-Grid**: `grid grid-cols-12 gap-4`, Kacheln mit `col-span-*`,
  Innenabstand `p-6` bis `p-8`. Kein Karten-im-Karten-Stapeln.
- Kachel-Titel: `text-[14px] font-bold` in der Tint-Ink-Farbe, optional GENAU
  ein Emoji dahinter. Uppercase-Label nur im Hero (`text-[12px] font-semibold
  uppercase tracking-wider text-teal-100`).
- Headline der Seite: `font-display text-2xl font-semibold text-ink` (Fraunces
  bleibt für Seitentitel/Logo — Zahlen sind Inter `zahl-hero`).
- Formularfelder: `rounded-2xl border border-sand-300 bg-white px-4 py-3
  focus:border-brand-600` — Radius 16px, nie eckig.

## Farb-Dramaturgie je Seite (damit es nicht beliebig wird)
- Hero/Haupt-KPI → `tile-hero`. Cent-Anker/Erfolg → `tile-mint`.
  Warten/Prüfung → weiße `tile` mit `chip-apricot`. Analyse/Verteilung →
  `tile-lavender`. DATEV/Übergabe → `tile-rose`. Einstellungen: weiße Kacheln,
  Tints nur als Akzent-Chips.

## Harte Invarianten (nicht verhandelbar)
1. **Nur Klassen ändern, NIE Logik**: kein Handler, kein API-Call, kein State,
   kein Text-Inhalt wird umgebaut (Wording-Feinschliff erlaubt, Bedeutung nie).
2. Alle Zahlen behalten `tnum`/`zahl-hero`; Beträge im Format `1.234,56 €`.
3. Status-Farben (`status-good/warn/crit`) bleiben Status — nie als Deko;
   Status nie ohne Icon/Text.
4. Emojis: höchstens 1 pro Kachel-Titel, NIE neben Beträgen/Zahlen, keine in
   Fehlermeldungen/Formularen.
5. Barrierefreiheit: Kontrast der Ink-auf-Tint-Paare nicht verändern,
   `aria-*`-Attribute erhalten.
6. Deutsch, Sie-Form — wie bisher.
7. `/design/*` und `docs/` NICHT anfassen; `npm run build` nicht starten
   (macht der Orchestrator einmal am Ende).
