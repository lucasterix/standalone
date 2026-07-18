/* ============================================================
   Demo-Dashboard — Design-Zielbild mit Beispieldaten.
   Dataviz-Regeln: dünne Marks + 2px-Lücken, eine Metrik = ein
   Farbton, Kategorial-Farben in fester Reihenfolge, Status-
   Farben nur für Zustände (mit Icon+Label), Zahlen tabellarisch,
   Hover-Tooltips auf jedem Mark, Legende bei ≥2 Serien.
   ============================================================ */

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/* ---------- Kopf-Kacheln (Hero-Zahlen) ---------- */
function StatTiles() {
  const tiles: Array<{
    label: string;
    wert: string;
    sub: string;
    hero?: boolean;
    warn?: boolean;
    good?: boolean;
    rose?: boolean;
  }> = [
    {
      label: "Automatisch erledigt",
      wert: "87 %",
      sub: "641 von 737 Buchungen im Juni",
      hero: true,
    },
    {
      label: "Zur Prüfung",
      wert: "6",
      sub: "≈ 4 Minuten Aufwand",
      warn: true,
    },
    {
      label: "Saldenabgleich Juni",
      wert: "0,00 €",
      sub: "737 / 737 Umsätze · 0 doppelt",
      good: true,
    },
    {
      label: "DATEV-Stapel Juni",
      wert: "bereit",
      sub: "1.204 Sätze · als Entwurf senden",
      rose: true,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={
            "p-5 " +
            (t.hero
              ? "tile-hero"
              : t.good
                ? "tile tile-mint"
                : t.rose
                  ? "tile tile-rose"
                  : "tile")
          }
        >
          <p
            className={
              "text-[12px] font-bold uppercase tracking-wider " +
              (t.hero
                ? "text-teal-100"
                : t.good
                  ? "text-tile-mint-ink"
                  : t.rose
                    ? "text-tile-rose-ink"
                    : "text-sand-500")
            }
          >
            {t.label}
          </p>
          <p
            className={
              "tnum zahl-hero mt-2 text-3xl " +
              (t.hero
                ? "text-white"
                : t.good
                  ? "text-status-good"
                  : t.warn
                    ? "text-amber-acc"
                    : "text-ink")
            }
          >
            {t.good && (
              <span aria-hidden className="mr-1.5 align-[3px] text-xl">
                ✓
              </span>
            )}
            {t.wert}
          </p>
          <p
            className={
              "mt-1 text-[13px] " +
              (t.hero
                ? "text-teal-50"
                : t.good
                  ? "text-tile-mint-ink"
                  : t.rose
                    ? "text-tile-rose-ink"
                    : "text-sand-600")
            }
          >
            {t.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Cent-Anker: Monatsleiste (Status, kein Chart) ---------- */
function SaldoLeiste() {
  const status: Array<"ok" | "laufend" | "leer"> = [
    "ok", "ok", "ok", "ok", "ok", "ok", "laufend",
    "leer", "leer", "leer", "leer", "leer",
  ];
  return (
    <section className="tile tile-mint p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-bold text-tile-mint-ink">
            Cent-Anker · Saldenabgleich 2026
          </h2>
          <p className="mt-0.5 text-[13px] text-tile-mint-ink/80">
            Bank ↔ Buchhaltung, je Monat auf den Cent geprüft
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-status-good">
          ✓ Alle geprüften Monate Cent-genau
        </span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {MONATE.map((m, i) => {
          const s = status[i];
          return (
            <div
              key={m}
              className={
                "group relative rounded-2xl px-2 py-3 text-center transition " +
                (s === "ok"
                  ? "bg-white shadow-sm"
                  : s === "laufend"
                    ? "border border-dashed border-tile-mint-ink/40 bg-white/60"
                    : "bg-white/35")
              }
            >
              <p className="text-[11px] font-semibold text-sand-600">{m}</p>
              <p
                className={
                  "mt-1 text-[13px] font-bold " +
                  (s === "ok"
                    ? "text-status-good"
                    : s === "laufend"
                      ? "text-sand-500"
                      : "text-sand-300")
                }
              >
                {s === "ok" ? "✓" : s === "laufend" ? "…" : "–"}
              </p>
              {/* Hover-Detail */}
              {s !== "leer" && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 hidden w-40 -translate-x-1/2 rounded-xl border border-sand-200 bg-white px-3 py-2 text-left shadow-lg group-hover:block"
                >
                  <p className="text-[11px] font-bold text-sand-900">
                    {m} 2026
                  </p>
                  <p className="tnum mt-0.5 text-[11px] text-sand-600">
                    {s === "ok"
                      ? "Δ 0,00 € · 0 doppelt"
                      : "läuft · 21 Umsätze offen"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Autopilot-Aktivität (2 Serien, gestapelt) ---------- */
function AktivitaetChart() {
  // Wochen Mai–Juni: [automatisch, zur Prüfung]
  const wochen: Array<[string, number, number]> = [
    ["KW 19", 148, 21],
    ["KW 20", 132, 17],
    ["KW 21", 155, 14],
    ["KW 22", 121, 12],
    ["KW 23", 168, 11],
    ["KW 24", 143, 8],
    ["KW 25", 176, 9],
    ["KW 26", 154, 6],
  ];
  const max = Math.max(...wochen.map(([, a, p]) => a + p));
  const H = 132;
  return (
    <section className="tile p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-bold text-ink">Autopilot-Aktivität</h2>
          <p className="mt-0.5 text-[13px] text-sand-600">
            Buchungen je Kalenderwoche
          </p>
        </div>
        {/* Legende (feste Serien-Reihenfolge) */}
        <div className="flex items-center gap-4 text-[12px] font-medium text-sand-700">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ background: "var(--color-cat-1)" }}
            />
            automatisch
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ background: "var(--color-cat-2)" }}
            />
            zur Prüfung
          </span>
        </div>
      </div>
      <div className="mt-5 flex items-end gap-3" style={{ height: H + 26 }}>
        {wochen.map(([kw, auto, pruef]) => {
          const hAuto = Math.round((auto / max) * H);
          const hPruef = Math.max(3, Math.round((pruef / max) * H));
          return (
            <div
              key={kw}
              className="group relative flex flex-1 flex-col items-center justify-end"
            >
              {/* zur Prüfung (oben, Werte-Ende gerundet) · 2px Lücke ·
                  automatisch (unten, an der Basislinie bündig) */}
              <div
                className="w-6 rounded-t-[4px] transition group-hover:opacity-80"
                style={{ height: hPruef, background: "var(--color-cat-2)" }}
              />
              <div
                className="mt-[2px] w-6 transition group-hover:opacity-80"
                style={{ height: hAuto, background: "var(--color-cat-1)" }}
              />
              <p className="mt-1.5 text-[11px] font-medium text-sand-500">
                {kw}
              </p>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-40 -translate-x-1/2 rounded-xl border border-sand-200 bg-white px-3 py-2 shadow-lg group-hover:block"
              >
                <p className="text-[11px] font-bold text-sand-900">{kw}</p>
                <p className="tnum text-[11px] text-sand-600">
                  {auto} automatisch · {pruef} geprüft
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Einnahmen nach Kostenträger (eine Metrik → ein Farbton) ---------- */
function KostentraegerListe() {
  const rows = [
    { name: "AOK — Pflegekasse", anteil: 38, betrag: "6.891" },
    { name: "Techniker Krankenkasse", anteil: 22, betrag: "3.985" },
    { name: "DAK-Gesundheit", anteil: 14, betrag: "2.540" },
    { name: "BARMER — Pflegekasse", anteil: 11, betrag: "1.990" },
    { name: "Selbstzahler & Übrige", anteil: 15, betrag: "2.708" },
  ];
  return (
    <section className="tile tile-lavender p-6">
      <h2 className="text-[14px] font-bold text-tile-lavender-ink">
        Einnahmen nach Kostenträger
      </h2>
      <p className="mt-0.5 text-[13px] text-tile-lavender-ink/80">Juni · brutto, in €</p>
      <ul className="mt-5 space-y-3.5">
        {rows.map((r) => (
          <li key={r.name} className="group relative">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-sand-800">
                {r.name}
              </span>
              <span className="tnum shrink-0 font-semibold text-sand-900">
                {r.betrag}&nbsp;€
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-brand-600 transition group-hover:bg-brand-700"
                style={{ width: `${r.anteil}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-tile-lavender-ink/80">
        Zahlungen laufen aufs jeweilige Personenkonto — Erlöse entstehen aus
        den Abrechnungen, nicht aus Schätzungen.
      </p>
    </section>
  );
}

/* ---------- Prüfliste (die 6 echten Entscheidungen) ---------- */
function Pruefliste() {
  const items = [
    {
      datum: "28.06.",
      text: "Überweisung Stadtwerke Norden",
      betrag: "−418,22",
      vorschlag: "Strom (6720)",
      grund: "Neuer Empfänger — 1× bestätigen, dann automatisch",
    },
    {
      datum: "27.06.",
      text: "Gutschrift AOK Rückläufer",
      betrag: "+96,40",
      vorschlag: "Erstattung zur Grundbuchung",
      grund: "Wahrscheinliche Rückzahlung vom 12.06. — bitte zuordnen",
    },
    {
      datum: "26.06.",
      text: "SEPA-Sammelüberweisung (63 Posten)",
      betrag: "−59.184,00",
      vorschlag: "Gehaltslauf Juni (3500)",
      grund: "Betrag passt zum Lohn-Muster — kurze Bestätigung",
    },
    {
      datum: "24.06.",
      text: "Kartenzahlung Bäckerei Freud",
      betrag: "−38,90",
      vorschlag: "Bewirtung (6880)?",
      grund: "Ohne Beleg nicht eindeutig — Beleg nachreichen oder wählen",
    },
    {
      datum: "23.06.",
      text: "Finanzamt Leer — Rate",
      betrag: "−7.000,00",
      vorschlag: "Steuerart wählen",
      grund: "Verwendungszweck ohne Steuerart — LSt oder USt?",
    },
    {
      datum: "21.06.",
      text: "Eingang R. Hartmann",
      betrag: "+2.400,00",
      vorschlag: "Privatzahler-Forderung",
      grund: "Kein offener Posten in dieser Höhe — bitte prüfen",
    },
  ];
  return (
    <section className="tile overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-100 px-6 py-4">
        <div>
          <h2 className="text-[14px] font-bold text-ink">
            Prüfliste — Ihre 6 Entscheidungen
          </h2>
          <p className="mt-0.5 text-[13px] text-sand-600">
            Alles andere hat der Autopilot erledigt. Jede Antwort trainiert ihn.
          </p>
        </div>
        <span className="chip chip-apricot">
          ≈ 4 Min.
        </span>
      </div>
      <ul className="divide-y divide-sand-100">
        {items.map((it) => (
          <li
            key={it.text}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3.5 transition hover:bg-sand-50"
          >
            <span className="tnum w-11 shrink-0 text-[12px] text-sand-500">
              {it.datum}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-sand-900">
                {it.text}
              </p>
              <p className="truncate text-[12px] text-sand-500">{it.grund}</p>
            </div>
            <span
              className={
                "tnum shrink-0 text-[14px] font-semibold " +
                (it.betrag.startsWith("−") ? "text-sand-900" : "text-status-good")
              }
            >
              {it.betrag}&nbsp;€
            </span>
            <span className="hidden shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-800 lg:inline">
              {it.vorschlag}
            </span>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                className="knopf knopf-primaer px-3.5 py-1.5 text-[12px]"
              >
                Übernehmen
              </button>
              <button
                type="button"
                className="knopf knopf-kontur px-3.5 py-1.5 text-[12px]"
              >
                Ändern
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Autopilot-Protokoll + DATEV ---------- */
function ProtokollUndDatev() {
  const log = [
    {
      zeit: "heute 06:12",
      text: "Sammelavis AOK (4.812,33 €) auf 12 Forderungen verteilt",
      regel: "Kostenträger-Abgleich",
    },
    {
      zeit: "heute 06:12",
      text: "38 Kassenzahlungen auf Personenkonten gebucht",
      regel: "Debitor-Zahlung",
    },
    {
      zeit: "gestern 18:04",
      text: "SV-Beiträge Knappschaft (3.412,60 €) → Einzugsstelle",
      regel: "gelerntes Muster · 14× bestätigt",
    },
    {
      zeit: "gestern 18:04",
      text: "Tankkarte Aral (211,48 €) → Fahrzeugkosten",
      regel: "gelerntes Muster · 31× bestätigt",
    },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="tile p-6">
        <h2 className="text-[14px] font-bold text-ink">Autopilot-Protokoll</h2>
        <p className="mt-0.5 text-[13px] text-sand-600">
          Jede automatische Buchung mit Begründung — und per Klick umkehrbar
        </p>
        <ul className="mt-4 space-y-3">
          {log.map((l) => (
            <li key={l.text} className="flex gap-3">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-brand-500"
              />
              <div className="min-w-0">
                <p className="text-[14px] text-sand-900">{l.text}</p>
                <p className="text-[12px] text-sand-500">
                  {l.zeit} · {l.regel}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tile tile-rose flex flex-col p-6">
        <h2 className="text-[14px] font-bold text-tile-rose-ink">DATEV-Übergabe</h2>
        <p className="mt-0.5 text-[13px] text-tile-rose-ink/80">
          Stapel entstehen erst, wenn der Monat Cent-genau ist
        </p>
        <div className="mt-4 flex-1 space-y-2.5">
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
            <div>
              <p className="text-[14px] font-semibold text-ink">
                Juni 2026
              </p>
              <p className="tnum text-[12px] text-sand-600">
                1.204 Sätze · Zahllast 0,00 € (§ 4 Nr. 16)
              </p>
            </div>
            <button
              type="button"
              className="knopf bg-tile-rose-ink px-4 py-2 text-[13px] text-white transition hover:opacity-90"
            >
              Als Entwurf senden
            </button>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
            <div>
              <p className="text-[14px] font-semibold text-ink">
                Mai 2026
              </p>
              <p className="tnum text-[12px] text-sand-600">
                1.187 Sätze · von Kanzlei übernommen
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-status-good">
              ✓ gesendet
            </span>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-tile-rose-ink/80">
          Ihre Steuerkanzlei erhält prüfbare Entwürfe — nichts wird ohne sie
          festgeschrieben.
        </p>
      </section>
    </div>
  );
}

export default function DemoDashboard() {
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-6 py-7">
      <StatTiles />
      <SaldoLeiste />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <AktivitaetChart />
        <KostentraegerListe />
      </div>
      <Pruefliste />
      <ProtokollUndDatev />
    </main>
  );
}
