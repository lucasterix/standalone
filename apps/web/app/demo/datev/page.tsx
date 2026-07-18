/* DATEV-Übergabe: Monatsstapel mit Geld-ein/aus (getrennt, nicht als
   irreführende Sammelsumme), USt-Kennzahlen und Entwurfs-Versand.
   Ein Stapel entsteht erst, wenn der Monat Cent-genau ist. */

const STAPEL = [
  {
    monat: "Juni 2026",
    status: "bereit",
    saetze: 1204,
    ein: "18.114,56",
    aus: "14.892,10",
    zahllast: "0,00",
    hinweis: "wartet auf Versand",
  },
  {
    monat: "Mai 2026",
    status: "gesendet",
    saetze: 1187,
    ein: "17.406,88",
    aus: "15.220,41",
    zahllast: "0,00",
    hinweis: "von Kanzlei übernommen · 12.06.",
  },
  {
    monat: "April 2026",
    status: "gesendet",
    saetze: 1231,
    ein: "18.930,12",
    aus: "14.114,77",
    zahllast: "0,00",
    hinweis: "von Kanzlei übernommen · 09.05.",
  },
];

export default function DatevSeite() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            DATEV-Übergabe
          </h1>
          <p className="mt-1 text-[14px] text-sand-600">
            Prüfbare Entwurfs-Stapel für Ihre Kanzlei — nichts wird ohne sie
            festgeschrieben.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-good-bg px-3 py-1.5 text-[12px] font-semibold text-status-good">
          ✓ Kanzlei Meyer &amp; Kollegen verbunden
        </span>
      </div>

      {/* Stapel-Tabelle */}
      <section className="tile overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead>
            <tr className="border-b border-sand-100 text-left text-[11px] font-semibold uppercase tracking-wider text-sand-500">
              <th className="px-5 py-3.5">Zeitraum</th>
              <th className="px-3 py-3.5 text-right">Sätze</th>
              <th className="px-3 py-3.5 text-right">Geld ein</th>
              <th className="px-3 py-3.5 text-right">Geld aus</th>
              <th className="px-3 py-3.5 text-right">USt-Zahllast</th>
              <th className="px-5 py-3.5 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {STAPEL.map((s) => (
              <tr key={s.monat} className="transition hover:bg-sand-50">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-sand-900">{s.monat}</p>
                  <p className="text-[12px] text-sand-500">{s.hinweis}</p>
                </td>
                <td className="tnum px-3 py-3.5 text-right text-sand-700">
                  {s.saetze.toLocaleString("de-DE")}
                </td>
                <td className="tnum px-3 py-3.5 text-right font-semibold text-status-good">
                  {s.ein} €
                </td>
                <td className="tnum px-3 py-3.5 text-right font-semibold text-sand-900">
                  −{s.aus} €
                </td>
                <td className="tnum px-3 py-3.5 text-right text-sand-700">
                  {s.zahllast} €
                </td>
                <td className="px-5 py-3.5 text-right">
                  {s.status === "bereit" ? (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        className="knopf bg-tile-rose-ink px-3.5 py-2 text-[12.5px] text-white transition hover:opacity-90"
                      >
                        Als Entwurf senden
                      </button>
                      <button
                        type="button"
                        className="knopf knopf-kontur px-3.5 py-2 text-[12.5px]"
                        title="DATEV-Format-Datei für den Import in der Kanzlei"
                      >
                        Export (EXTF)
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-status-good">
                      ✓ gesendet
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="tile tile-rose p-6">
          <h2 className="text-[14px] font-bold text-tile-rose-ink">
            Warum „Zahllast 0,00 €"?
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
            Pflegeleistungen sind nach <strong>§ 4 Nr. 16 UStG</strong>{" "}
            umsatzsteuerfrei — gebucht wird brutto, ohne Vorsteuerabzug
            (§ 15 Abs. 2). Steuerpflichtige Ausnahmen (z. B. Kiosk,
            Essenslieferung) erhalten ihren Steuerschlüssel einzeln und
            erscheinen dann hier.
          </p>
        </section>
        <section className="tile p-6">
          <h2 className="text-[14px] font-bold text-ink">Zwei Wege zur Kanzlei</h2>
          <ul className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-sand-700">
            <li className="flex gap-2">
              <span aria-hidden className="text-brand-600">
                ●
              </span>
              <span>
                <strong>Direkt nach DATEV:</strong> der Stapel landet als
                prüfbarer Entwurf im Rechnungswesen Ihrer Kanzlei
                (Buchungsdatenservice).
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-brand-600">
                ●
              </span>
              <span>
                <strong>Als Datei (EXTF):</strong> klassischer DATEV-Import —
                funktioniert mit jeder Kanzlei, ganz ohne Umstellung.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
