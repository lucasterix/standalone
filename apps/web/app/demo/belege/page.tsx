/* Beleg-Eingang: Mail-Postfach + Upload, KI-Auslese, Bank-Zuordnung.
   E-Rechnungen (XRechnung/ZUGFeRD) werden strukturiert gelesen — besser
   als jede PDF-Erkennung. */

const BELEGE = [
  {
    von: "rechnung@medizinshop-nord.de",
    lieferant: "Medizinshop Nord GmbH",
    nr: "RE-2026-8841",
    betrag: "312,44 €",
    konto: "6630 · Medizinischer Pflegebedarf",
    status: "zugeordnet" as const,
    detail: "Bankumsatz vom 22.06. erkannt — Zahlung verknüpft",
    art: "E-Rechnung (ZUGFeRD)",
  },
  {
    von: "buchhaltung@textilservice-emden.de",
    lieferant: "Textilservice Emden",
    nr: "2026-06-114",
    betrag: "486,20 €",
    konto: "6823 · Fremdleistung Wäscherei",
    status: "zugeordnet" as const,
    detail: "Offener Posten ausgeglichen (Kreditor 70012)",
    art: "E-Rechnung (XRechnung)",
  },
  {
    von: "noreply@autohaus-janssen.de",
    lieferant: "Autohaus Janssen",
    nr: "W-55102",
    betrag: "894,03 €",
    konto: "7714 · Reparatur (Fahrzeuge)?",
    status: "pruefen" as const,
    detail: "Kein passender Bankumsatz — Lastschrift folgt vermutlich",
    art: "PDF · KI-gelesen",
  },
  {
    von: "Upload (Handy-Foto)",
    lieferant: "Bäckerei Freud",
    nr: "—",
    betrag: "38,90 €",
    konto: "6880 · Bewirtung?",
    status: "pruefen" as const,
    detail: "Passt zur Kartenzahlung vom 24.06. — bitte bestätigen",
    art: "Foto · KI-gelesen",
  },
];

export default function BelegeSeite() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Belege
          </h1>
          <p className="mt-1 text-[14px] text-sand-600">
            Einfach weiterleiten — gelesen, kontiert und dem Bankumsatz
            zugeordnet wird automatisch.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-sand-300 bg-white px-4 py-2 text-[13px] font-semibold text-sand-700 transition hover:border-brand-600 hover:text-brand-700"
        >
          Beleg hochladen
        </button>
      </div>

      {/* Postfach-Hinweis */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold text-brand-900">
            Ihr Beleg-Postfach
          </p>
          <p className="tnum text-[14px] text-brand-800">
            belege-sonnenweg@kontoklar.app
          </p>
        </div>
        <p className="max-w-sm text-[12.5px] leading-relaxed text-brand-900/70">
          Rechnungen einfach dorthin weiterleiten (oder Lieferanten die Adresse
          geben) — E-Rechnungen werden strukturiert gelesen, PDFs per KI.
        </p>
      </div>

      <ul className="space-y-3">
        {BELEGE.map((b) => (
          <li
            key={b.nr + b.lieferant}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-sand-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[14.5px] font-semibold text-sand-900">
                  {b.lieferant}
                </span>
                <span className="rounded-md bg-sand-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-sand-500">
                  {b.art}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[12.5px] text-sand-500">
                {b.von} · Nr. {b.nr}
              </p>
              <p className="mt-1 truncate text-[12.5px] text-sand-600">
                {b.detail}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tnum text-[15px] font-bold text-sand-900">
                {b.betrag}
              </p>
              <p className="text-[12px] text-sand-600">{b.konto}</p>
            </div>
            {b.status === "zugeordnet" ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-good-bg px-3 py-1.5 text-[12px] font-semibold text-status-good">
                ✓ verbucht
              </span>
            ) : (
              <button
                type="button"
                className="shrink-0 rounded-xl bg-brand-700 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-800"
              >
                Prüfen
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[12px] leading-relaxed text-sand-500">
        Ab 2027/2028 wird die E-Rechnung im B2B Pflicht — hier ist sie es
        heute schon: strukturierte Rechnungen laufen ohne Erkennungsfehler
        durch.
      </p>
    </main>
  );
}
