/* Design-Variante A — „Editorial Ledger".
   These: Eine Fibu ist ein Dokument, kein Dashboard. Magazin-Typografie,
   Hairlines statt Karten, große Serifen-Zahlen, Marginalien. Ruhe als
   Luxus — die mutigste, eigenständigste Richtung. Statischer Mockup. */

const MONATE = [
  { m: "Jan", tx: 33 }, { m: "Feb", tx: 38 }, { m: "Mär", tx: 35 },
  { m: "Apr", tx: 37 }, { m: "Mai", tx: 38 }, { m: "Jun", tx: 43 },
];

const FAELLE = [
  { d: "26. Jun", t: "R. Hartmann · Zuzahlung", b: "172,05" },
  { d: "26. Jun", t: "Sanitätshaus Weser", b: "365,89" },
  { d: "23. Jun", t: "R. Hartmann · Zuzahlung", b: "233,89" },
  { d: "14. Jun", t: "Überweisung K. Albers", b: "246,83" },
];

const TRAEGER = [
  { n: "AOK Nordost", p: 38 }, { n: "Techniker", p: 24 },
  { n: "DAK Gesundheit", p: 18 }, { n: "Barmer", p: 12 }, { n: "Privat", p: 8 },
];

export default function VarianteA() {
  return (
    <main className="min-h-screen bg-[#faf7f1] px-8 py-10 text-[#211e19]" style={{ fontFeatureSettings: '"tnum"' }}>
      <div className="mx-auto max-w-6xl">
        {/* Kopf wie ein Zeitungskopf */}
        <header className="flex items-end justify-between border-b-2 border-[#211e19] pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8072]">
              Kontoklar · Monatsblatt
            </p>
            <h1 className="font-display mt-1 text-[42px] font-semibold leading-none tracking-tight">
              Pflegedienst Sonnenweg GmbH
            </h1>
          </div>
          <p className="font-display text-[20px] italic text-[#6b6459]">Juli 2026</p>
        </header>

        {/* Hero-Zeile: die eine Zahl + Beweis */}
        <section className="grid grid-cols-12 gap-8 border-b border-[#e2dbc9] py-10">
          <div className="col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8072]">
              Automatisch erledigt
            </p>
            <p className="font-display mt-2 text-[132px] font-semibold leading-[0.9] tracking-tight text-[#134e4a]">
              91<span className="text-[64px] align-top">%</span>
            </p>
            <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-[#6b6459]">
              203 von 224 Buchungen hat der Autopilot erledigt —
              <em className="font-display"> 21 warten auf Ihr Wort.</em>
            </p>
          </div>
          <div className="col-span-4 border-l border-[#e2dbc9] pl-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8072]">
              Saldenabgleich Juni
            </p>
            <p className="font-display mt-2 text-[56px] font-semibold leading-none text-[#0f6b45]">
              0,00 €
            </p>
            <p className="mt-2 text-[13px] text-[#6b6459]">
              Differenz zur Bank · 43 / 43 Umsätze
            </p>
            <div className="mt-6 flex items-baseline gap-4">
              {MONATE.map((x) => (
                <div key={x.m} className="text-center">
                  <p className="text-[15px] leading-none text-[#0f6b45]">✓</p>
                  <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#8a8072]">{x.m}</p>
                  <p className="text-[10.5px] text-[#b3a78f]">{x.tx}</p>
                </div>
              ))}
              <div className="text-center opacity-45">
                <p className="text-[15px] leading-none">·</p>
                <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider">Jul</p>
                <p className="text-[10.5px]">läuft</p>
              </div>
            </div>
          </div>
          <div className="col-span-3 border-l border-[#e2dbc9] pl-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8072]">
              DATEV
            </p>
            <p className="font-display mt-2 text-[28px] font-semibold leading-tight">
              Juni ist<br />übergabereif.
            </p>
            <p className="mt-2 text-[13px] text-[#6b6459]">39 Sätze, Cent-geprüft.</p>
            <a href="#" className="mt-5 inline-block border-b-2 border-[#134e4a] pb-0.5 text-[13.5px] font-semibold text-[#134e4a]">
              Stapel erzeugen →
            </a>
          </div>
        </section>

        {/* Zwei Spalten: Prüfliste als Register + Kostenträger als Balkenzeilen */}
        <section className="grid grid-cols-12 gap-8 py-9">
          <div className="col-span-7">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[22px] font-semibold">Ihre 21 Entscheidungen</h2>
              <a href="#" className="text-[12.5px] font-semibold uppercase tracking-wider text-[#134e4a]">
                Alle öffnen →
              </a>
            </div>
            <ol className="mt-4">
              {FAELLE.map((f, i) => (
                <li key={i} className="group flex items-baseline gap-5 border-b border-[#e9e3d3] py-3.5">
                  <span className="font-display w-7 text-[15px] italic text-[#b3a78f]">{i + 1}.</span>
                  <span className="w-16 text-[12px] text-[#8a8072]">{f.d}</span>
                  <span className="flex-1 text-[15px] font-medium">{f.t}</span>
                  <span className="font-display text-[17px] font-semibold">{f.b} €</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] italic text-[#8a8072]">
              … und 17 weitere. Jede Antwort lehrt den Autopiloten.
            </p>
          </div>
          <div className="col-span-5 border-l border-[#e2dbc9] pl-8">
            <h2 className="font-display text-[22px] font-semibold">Woher das Geld kam</h2>
            <div className="mt-5 space-y-3.5">
              {TRAEGER.map((t) => (
                <div key={t.n}>
                  <div className="flex items-baseline justify-between text-[13.5px]">
                    <span className="font-medium">{t.n}</span>
                    <span className="font-display font-semibold">{t.p} %</span>
                  </div>
                  <div className="mt-1 h-[3px] w-full bg-[#eee8d8]">
                    <div className="h-full bg-[#134e4a]" style={{ width: `${t.p}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-[#e2dbc9] pt-4 text-[12px] leading-relaxed text-[#8a8072]">
              Fußnote: Alle Zahlen live aus Bank &amp; Journal — nichts davon
              ist eine Schätzung.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
