/* Offene Posten: Forderungen je Kostenträger mit Sammelavis-Auflösung.
   Der Kern des Kostenträger-Modus — Zahlungen laufen aufs Personenkonto,
   Forderungen kommen aus der Abrechnung. */

const FORDERUNGEN = [
  {
    traeger: "AOK — Pflegekasse",
    konto: "10000",
    offen: "8.412,73 €",
    posten: 21,
    aelteste: "14 Tage",
    hinweis: "Sammelavis erwartet ~05.07.",
  },
  {
    traeger: "Techniker Krankenkasse",
    konto: "10003",
    offen: "4.106,20 €",
    posten: 12,
    aelteste: "9 Tage",
    hinweis: "zahlt üblich nach 12 Tagen",
  },
  {
    traeger: "DAK-Gesundheit",
    konto: "10002",
    offen: "2.988,90 €",
    posten: 9,
    aelteste: "21 Tage",
    hinweis: "1 Posten über Zahlungsziel",
    warn: true,
  },
  {
    traeger: "Landkreis Aurich (Sozialamt)",
    konto: "10009",
    offen: "1.744,00 €",
    posten: 4,
    aelteste: "35 Tage",
    hinweis: "Sozialhilfeträger — erfahrungsgemäß langsam",
    warn: true,
  },
  {
    traeger: "Selbstzahler",
    konto: "diverse",
    offen: "1.212,40 €",
    posten: 7,
    aelteste: "6 Tage",
    hinweis: "3 Lastschriften angekündigt",
  },
];

export default function PostenSeite() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Offene Posten
          </h1>
          <p className="mt-1 text-[14px] text-sand-600">
            Wer schuldet Ihnen was — je Kostenträger, aus Ihren Abrechnungen.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
            Offene Forderungen
          </p>
          <p className="tnum zahl-hero text-2xl text-ink">
            18.464,23 €
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {FORDERUNGEN.map((f) => (
          <li
            key={f.traeger}
            className="tile flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-sand-900">
                {f.traeger}
                <span className="tnum ml-2 text-[12px] font-medium text-sand-400">
                  {f.konto}
                </span>
              </p>
              <p className="mt-0.5 text-[12.5px] text-sand-500">
                {f.posten} Posten · älteste {f.aelteste} · {f.hinweis}
              </p>
            </div>
            <p className="tnum shrink-0 text-[15px] font-bold text-sand-900">
              {f.offen}
            </p>
            {f.warn ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-warn-bg px-3 py-1.5 text-[12px] font-semibold text-status-warn">
                ⚠ prüfen
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-good-bg px-3 py-1.5 text-[12px] font-semibold text-status-good">
                ✓ im Rahmen
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Sammelavis-Prinzip */}
      <section className="tile tile-lavender p-6">
        <h2 className="text-[14px] font-bold text-tile-lavender-ink">
          So löst sich ein Sammelavis auf
        </h2>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink">
          Zahlt die Kasse (z. B. 4.812,33 € in einem Betrag), gleicht{" "}
          der Autopilot die enthaltenen Einzelforderungen aus — Klient für
          Klient, Leistungsart für Leistungsart. Bleibt ein Rest, sehen Sie
          exakt welcher Posten fehlt, statt einer stummen Differenz. Kürzt die
          Kasse einen Posten, wird daraus automatisch ein Klärungsfall — kein
          verlorenes Geld mehr.
        </p>
      </section>
    </main>
  );
}
