/* Design-Variante C — „Bento".
   These: Buchhaltung darf sich leicht anfühlen. Farbige Bento-Kacheln,
   runde Formen, große freundliche Zahlen, ein Gradient-Hero. Nahbar wie
   moderne Consumer-Apps, ohne die Zahlen zu verniedlichen. Mockup. */

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun"];

const FAELLE = [
  { t: "R. Hartmann · Zuzahlung", b: "172,05 €" },
  { t: "Sanitätshaus Weser", b: "365,89 €" },
  { t: "R. Hartmann · Zuzahlung", b: "233,89 €" },
];

const TRAEGER = [
  { n: "AOK", p: 38, f: "#0d9488" }, { n: "TK", p: 24, f: "#b45309" },
  { n: "DAK", p: 18, f: "#6d5bd0" }, { n: "Barmer", p: 12, f: "#b8456b" },
  { n: "Privat", p: 8, f: "#8a8072" },
];

export default function VarianteC() {
  return (
    <main className="min-h-screen bg-[#f5f3ef] px-8 py-8 text-[#26221c]" style={{ fontFeatureSettings: '"tnum"' }}>
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-block h-4 w-4 rounded-[6px] bg-[#0d9488]">
              <span className="absolute inset-1 rounded-full bg-[#f5f3ef]" />
            </span>
            <span className="font-display text-xl font-semibold">Kontoklar</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold shadow-sm">
              Pflegedienst Sonnenweg 🌿
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#134e4a] text-[13px] font-bold text-white">SW</span>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          {/* Hero-Gradient-Kachel */}
          <section className="col-span-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#2dd4bf] p-8 text-white shadow-lg shadow-teal-900/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-100">
                  Diesen Monat automatisch erledigt
                </p>
                <p className="mt-3 text-[92px] font-extrabold leading-none tracking-tight">91 %</p>
                <p className="mt-2 text-[15px] text-teal-50">
                  203 von 224 Buchungen — nur <strong>21</strong> brauchen Sie.
                </p>
                <button className="mt-6 rounded-full bg-white px-6 py-3 text-[14px] font-bold text-[#0f766e] shadow-md">
                  21 Entscheidungen treffen →
                </button>
              </div>
              {/* Deko-Ringe */}
              <div aria-hidden className="relative h-40 w-40 shrink-0">
                <div className="absolute inset-0 rounded-full border-[10px] border-white/20" />
                <div className="absolute inset-4 rounded-full border-[10px] border-white/30" />
                <div className="absolute inset-8 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-[34px]">🚀</div>
              </div>
            </div>
          </section>

          {/* Cent-Anker */}
          <section className="col-span-5 rounded-[28px] bg-[#dcefe6] p-7">
            <p className="text-[13px] font-bold uppercase tracking-wider text-[#12695a]">Cent-Anker</p>
            <p className="mt-2 text-[46px] font-extrabold leading-none text-[#0f6b45]">0,00 €</p>
            <p className="mt-1 text-[13.5px] font-medium text-[#3f7a63]">
              Differenz zur Bank — sechs Monate in Folge
            </p>
            <div className="mt-5 flex gap-2">
              {MONATE.map((m) => (
                <span key={m} className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-white text-[10px] font-bold text-[#0f6b45] shadow-sm">
                  <span className="text-[13px]">✓</span>{m}
                </span>
              ))}
            </div>
          </section>

          {/* Prüfliste */}
          <section className="col-span-5 rounded-[28px] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold">Als Nächstes 📋</p>
              <span className="rounded-full bg-[#fbe7d4] px-3 py-1 text-[12px] font-bold text-[#9a5510]">21 offen</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {FAELLE.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl bg-[#f7f5f1] px-4 py-3">
                  <span className="text-[13.5px] font-semibold">{f.t}</span>
                  <span className="text-[13.5px] font-bold text-[#26221c]">{f.b}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Kostenträger Donut */}
          <section className="col-span-4 rounded-[28px] bg-[#e9e4f8] p-7">
            <p className="text-[15px] font-bold text-[#4c3fa3]">Woher kam das Geld?</p>
            <div className="mt-4 flex items-center gap-5">
              <div
                aria-hidden
                className="h-28 w-28 rounded-full"
                style={{
                  background: "conic-gradient(#0d9488 0 38%, #b45309 38% 62%, #6d5bd0 62% 80%, #b8456b 80% 92%, #8a8072 92% 100%)",
                  WebkitMask: "radial-gradient(circle at center, transparent 34px, black 35px)",
                  mask: "radial-gradient(circle at center, transparent 34px, black 35px)",
                }}
              />
              <ul className="space-y-1.5 text-[12.5px] font-semibold">
                {TRAEGER.map((t) => (
                  <li key={t.n} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.f }} />
                    {t.n} <span className="text-[#8a8072]">{t.p} %</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* DATEV */}
          <section className="col-span-3 flex flex-col justify-between rounded-[28px] bg-[#f7dfe7] p-7">
            <div>
              <p className="text-[15px] font-bold text-[#96305c]">DATEV 📦</p>
              <p className="mt-2 text-[22px] font-extrabold leading-snug">Juni ist bereit!</p>
              <p className="mt-1 text-[12.5px] font-medium text-[#a96b85]">39 Sätze · Cent-geprüft</p>
            </div>
            <button className="mt-4 rounded-full bg-[#96305c] py-2.5 text-[13px] font-bold text-white">
              Stapel erzeugen
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
