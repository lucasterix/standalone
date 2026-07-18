/* Design-Variante B — „Cockpit".
   These: Ein Autopilot verdient ein Instrumentenbrett. Dunkles Petrol,
   Glas-Karten, ein echter Quoten-Ring, Verlaufs-Chart, leuchtende
   Status-Punkte. Modernste SaaS-Anmutung. Statischer Mockup. */

const WOCHEN = [78, 82, 85, 88, 86, 91];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun"];

const FAELLE = [
  { d: "26.06.", t: "R. Hartmann · Zuzahlung", b: "172,05", o: "Fallback" },
  { d: "26.06.", t: "Sanitätshaus Weser", b: "365,89", o: "Neu" },
  { d: "23.06.", t: "R. Hartmann · Zuzahlung", b: "233,89", o: "Fallback" },
];

const KARTE = "rounded-2xl border border-[#1d3a36] bg-[#0f2220]/80 p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur";

export default function VarianteB() {
  const R = 64, U = 2 * Math.PI * R, quote = 0.91;
  const punkte = WOCHEN.map((w, i) =>
    `${20 + i * 52},${96 - ((w - 70) / 25) * 72}`).join(" ");

  return (
    <main className="min-h-screen bg-[#0a1716] px-8 py-8 text-[#e6f1ef]" style={{ fontFeatureSettings: '"tnum"' }}>
      {/* Hintergrund-Glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(900px 420px at 25% -10%, rgba(13,148,136,0.16), transparent 65%)" }} />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between pb-7">
          <div className="flex items-center gap-3">
            <span className="relative inline-block h-4 w-4 rounded-[6px] bg-[#14b8a6] shadow-[0_0_18px_rgba(20,184,166,0.7)]">
              <span className="absolute inset-1 rounded-full bg-[#0a1716]" />
            </span>
            <span className="font-display text-xl font-semibold">Kontoklar</span>
            <span className="ml-3 rounded-full border border-[#1d3a36] px-3 py-1 text-[12px] text-[#8fb6b0]">
              Pflegedienst Sonnenweg GmbH
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-[#8fb6b0]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2ee6a8] shadow-[0_0_10px_rgba(46,230,168,0.8)]" />
            Autopilot aktiv · Stufe ausgewogen
          </div>
        </header>

        <div className="grid grid-cols-12 gap-5">
          {/* Quoten-Ring */}
          <section className={`col-span-4 ${KARTE} flex flex-col items-center`}>
            <p className="self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f9c95]">
              Automatisierungs-Quote
            </p>
            <div className="relative mt-5">
              <svg width="170" height="170" viewBox="0 0 170 170">
                <circle cx="85" cy="85" r={R} stroke="#16302d" strokeWidth="13" fill="none" />
                <circle cx="85" cy="85" r={R} stroke="#14b8a6" strokeWidth="13" fill="none"
                  strokeLinecap="round" strokeDasharray={`${U * quote} ${U}`}
                  transform="rotate(-90 85 85)"
                  style={{ filter: "drop-shadow(0 0 10px rgba(20,184,166,0.5))" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-[44px] font-semibold leading-none">91 %</p>
                <p className="mt-1 text-[11.5px] text-[#8fb6b0]">203 / 224</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[13px] leading-relaxed text-[#8fb6b0]">
              21 Fälle warten auf Sie —<br />
              <a href="#" className="font-semibold text-[#2ee6a8]">Prüfliste öffnen →</a>
            </p>
          </section>

          {/* Verlauf */}
          <section className={`col-span-8 ${KARTE}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f9c95]">
                Quote im Verlauf · 6 Monate
              </p>
              <p className="text-[12px] text-[#8fb6b0]">Ziel ≥ 85 %</p>
            </div>
            <svg viewBox="0 0 300 110" className="mt-4 w-full">
              {[70, 80, 90].map((g) => (
                <g key={g}>
                  <line x1="20" x2="290" y1={96 - ((g - 70) / 25) * 72} y2={96 - ((g - 70) / 25) * 72}
                    stroke="#16302d" strokeWidth="1" />
                  <text x="0" y={99 - ((g - 70) / 25) * 72} fill="#537c76" fontSize="8">{g}%</text>
                </g>
              ))}
              <polyline points={punkte} fill="none" stroke="#14b8a6" strokeWidth="2.5"
                strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(20,184,166,0.6))" }} />
              {WOCHEN.map((w, i) => (
                <circle key={i} cx={20 + i * 52} cy={96 - ((w - 70) / 25) * 72} r="3.5"
                  fill="#0a1716" stroke="#2ee6a8" strokeWidth="2" />
              ))}
              {MONATE.map((m, i) => (
                <text key={m} x={20 + i * 52} y="108" fill="#6f9c95" fontSize="8.5" textAnchor="middle">{m}</text>
              ))}
            </svg>
          </section>

          {/* Cent-Anker-Band */}
          <section className={`col-span-8 ${KARTE}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f9c95]">
                Cent-Anker · Bank ↔ Buchhaltung
              </p>
              <p className="text-[13px] font-semibold text-[#2ee6a8]">Differenz 0,00 € · 6 Monate in Folge</p>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2.5">
              {MONATE.map((m) => (
                <div key={m} className="rounded-xl border border-[#1d5c4d] bg-[#0d2b26] px-3 py-3 text-center">
                  <p className="text-[13px] text-[#2ee6a8]">✓</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#8fb6b0]">{m}</p>
                </div>
              ))}
            </div>
          </section>

          {/* DATEV-Status */}
          <section className={`col-span-4 ${KARTE}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f9c95]">
              DATEV-Übergabe
            </p>
            <p className="font-display mt-3 text-[24px] font-semibold leading-snug">
              Juni bereit<span className="text-[#2ee6a8]">.</span>
            </p>
            <p className="mt-1 text-[13px] text-[#8fb6b0]">39 Sätze · Cent-geprüft</p>
            <button className="mt-5 w-full rounded-xl bg-[#14b8a6] py-2.5 text-[13.5px] font-semibold text-[#04211d] shadow-[0_0_24px_rgba(20,184,166,0.35)]">
              EXTF-Stapel erzeugen
            </button>
          </section>

          {/* Prüfliste kompakt */}
          <section className={`col-span-12 ${KARTE}`}>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f9c95]">
                Als Nächstes für Sie
              </p>
              <a href="#" className="text-[12.5px] font-semibold text-[#2ee6a8]">Alle 21 →</a>
            </div>
            <div className="mt-3 divide-y divide-[#16302d]">
              {FAELLE.map((f, i) => (
                <div key={i} className="flex items-center gap-5 py-3">
                  <span className="w-14 text-[12px] text-[#6f9c95]">{f.d}</span>
                  <span className="flex-1 text-[14px] font-medium">{f.t}</span>
                  <span className="rounded-full border border-[#1d3a36] px-2.5 py-0.5 text-[11px] text-[#8fb6b0]">{f.o}</span>
                  <span className="w-24 text-right text-[14.5px] font-semibold">{f.b} €</span>
                  <button className="rounded-lg border border-[#1d5c4d] px-3.5 py-1.5 text-[12px] font-semibold text-[#2ee6a8]">
                    Entscheiden
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
