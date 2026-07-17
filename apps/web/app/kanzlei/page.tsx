import Link from "next/link";
import { BRAND } from "@/lib/brand";

/* ============================================================
   Kanzlei-Cockpit — das zweite Gesicht des Produkts (PRODUKT.md § 1).
   Eine Kanzlei betreut viele Mandate; sortiert wird nach
   Handlungsbedarf, nicht alphabetisch. Ziel: der Monatsabschluss
   aller Pflege-Mandate an einem Vormittag.
   ============================================================ */

type Mandat = {
  name: string;
  ort: string;
  anker: "ok" | "diff" | "laeuft";
  ankerDetail: string;
  offen: number;
  stapel: "bereit" | "gesendet" | "uebernommen" | "offen";
  stapelDetail: string;
  aktivitaet: string;
  rueckfrage?: string;
};

const MANDATE: Mandat[] = [
  {
    name: "Pflegedienst Wattenmeer GmbH",
    ort: "Emden",
    anker: "diff",
    ankerDetail: "Δ 96,40 € im Juni",
    offen: 9,
    stapel: "offen",
    stapelDetail: "wartet auf grünen Monat",
    aktivitaet: "vor 2 Std.",
    rueckfrage: "AOK-Gutschrift 96,40 € — Erstattung oder Doppelzahlung?",
  },
  {
    name: "Pflegedienst Sonnenweg GmbH",
    ort: "Aurich",
    anker: "ok",
    ankerDetail: "Juni Cent-genau",
    offen: 6,
    stapel: "bereit",
    stapelDetail: "1.204 Sätze · Juni",
    aktivitaet: "heute 06:12",
  },
  {
    name: "Tagespflege Deichblick gGmbH",
    ort: "Norden",
    anker: "ok",
    ankerDetail: "Juni Cent-genau",
    offen: 0,
    stapel: "bereit",
    stapelDetail: "612 Sätze · Juni",
    aktivitaet: "gestern",
  },
  {
    name: "Ambulante Pflege Hafenkante",
    ort: "Leer",
    anker: "ok",
    ankerDetail: "Juni Cent-genau",
    offen: 2,
    stapel: "bereit",
    stapelDetail: "887 Sätze · Juni",
    aktivitaet: "gestern",
    rueckfrage: "Bewirtungsbeleg 214 € — Anlass fehlt für den Abzug.",
  },
  {
    name: "Betreuungsdienst Friesenherz",
    ort: "Wittmund",
    anker: "laeuft",
    ankerDetail: "Juli läuft · 21 offen",
    offen: 3,
    stapel: "uebernommen",
    stapelDetail: "Juni übernommen · 04.07.",
    aktivitaet: "vor 3 Tagen",
  },
  {
    name: "Sozialstation St. Marien e. V.",
    ort: "Papenburg",
    anker: "ok",
    ankerDetail: "Juni Cent-genau",
    offen: 1,
    stapel: "gesendet",
    stapelDetail: "im DATEV-Eingang",
    aktivitaet: "vor 4 Std.",
  },
];

const ANKER_STIL = {
  ok: { text: "text-status-good", bg: "bg-status-good-bg", icon: "✓" },
  diff: { text: "text-status-crit", bg: "bg-status-crit-bg", icon: "Δ" },
  laeuft: { text: "text-sand-500", bg: "bg-sand-100", icon: "…" },
} as const;

function Kpi({ wert, label, warn }: { wert: string; label: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white px-5 py-4 shadow-sm">
      <p
        className={
          "tnum font-display text-3xl font-bold " +
          (warn ? "text-amber-acc" : "text-sand-900")
        }
      >
        {wert}
      </p>
      <p className="mt-0.5 text-[13px] text-sand-600">{label}</p>
    </div>
  );
}

export default function KanzleiCockpit() {
  const bereit = MANDATE.filter((m) => m.stapel === "bereit").length;
  const rueckfragen = MANDATE.filter((m) => m.rueckfrage).length;
  return (
    <div className="min-h-screen bg-sand-100/50">
      {/* Kanzlei-Kopf */}
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span
                aria-hidden
                className="relative top-[1px] inline-block h-3.5 w-3.5 rounded-[5px] bg-brand-600"
              >
                <span className="absolute inset-[3.5px] rounded-full bg-white" />
              </span>
              <span className="font-display text-lg font-semibold text-sand-900">
                {BRAND.name}
              </span>
            </Link>
            <span className="rounded-lg bg-brand-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-100">
              Kanzlei-Cockpit
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-[14px] font-semibold text-sand-800 sm:block">
              Steuerkanzlei Meyer &amp; Kollegen
            </p>
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-800 text-sm font-bold text-white"
            >
              MK
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-5 py-7">
        {/* KPI-Zeile */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi wert="14" label="Pflege-Mandate betreut" />
          <Kpi wert="11" label="Monate Cent-genau (Juni)" />
          <Kpi wert={String(bereit)} label="Stapel abholbereit" warn />
          <Kpi wert={String(rueckfragen)} label="Rückfragen offen" warn />
        </div>

        {/* Sammel-Aktion */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-5 py-4">
          <div>
            <p className="text-[14px] font-semibold text-brand-900">
              {bereit} Monatsstapel sind Cent-geprüft und abholbereit
            </p>
            <p className="text-[12.5px] text-brand-900/70">
              Zusammen 2.703 Buchungssätze — als prüfbare Entwürfe in Ihr
              DATEV Rechnungswesen
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            Alle {bereit} als Entwurf abrufen
          </button>
        </div>

        {/* Mandanten-Tabelle — sortiert nach Handlungsbedarf */}
        <section className="overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-[13.5px]">
            <thead>
              <tr className="border-b border-sand-100 text-left text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                <th className="px-5 py-3.5">Mandat</th>
                <th className="px-3 py-3.5">Cent-Anker</th>
                <th className="px-3 py-3.5 text-right">Beim Mandanten</th>
                <th className="px-3 py-3.5">DATEV-Stapel</th>
                <th className="px-3 py-3.5">Aktivität</th>
                <th className="px-5 py-3.5 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {MANDATE.map((m) => {
                const st = ANKER_STIL[m.anker];
                return (
                  <tr key={m.name} className="align-top transition hover:bg-sand-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-sand-900">{m.name}</p>
                      <p className="text-[12px] text-sand-500">{m.ort}</p>
                      {m.rueckfrage && (
                        <p className="mt-1.5 inline-flex max-w-[26rem] items-start gap-1.5 rounded-lg bg-status-warn-bg px-2.5 py-1.5 text-[12px] leading-snug text-status-warn">
                          <span aria-hidden>💬</span> {m.rueckfrage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${st.bg} ${st.text}`}
                      >
                        <span aria-hidden>{st.icon}</span>
                        {m.ankerDetail}
                      </span>
                    </td>
                    <td className="tnum px-3 py-4 text-right text-sand-700">
                      {m.offen === 0 ? (
                        <span className="text-status-good">✓ nichts</span>
                      ) : (
                        `${m.offen} offen`
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {m.stapel === "bereit" && (
                        <span className="font-semibold text-amber-acc">
                          ● bereit
                        </span>
                      )}
                      {m.stapel === "gesendet" && (
                        <span className="font-semibold text-brand-700">
                          ↗ gesendet
                        </span>
                      )}
                      {m.stapel === "uebernommen" && (
                        <span className="font-semibold text-status-good">
                          ✓ übernommen
                        </span>
                      )}
                      {m.stapel === "offen" && (
                        <span className="text-sand-500">—</span>
                      )}
                      <p className="text-[12px] text-sand-500">{m.stapelDetail}</p>
                    </td>
                    <td className="px-3 py-4 text-[12.5px] text-sand-500">
                      {m.aktivitaet}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        {m.stapel === "bereit" && (
                          <button
                            type="button"
                            className="rounded-lg bg-brand-700 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-800"
                          >
                            Stapel abrufen
                          </button>
                        )}
                        <Link
                          href="/demo"
                          className="rounded-lg border border-sand-300 px-3 py-1.5 text-[12px] font-semibold text-sand-700 transition hover:border-brand-600 hover:text-brand-700"
                        >
                          Öffnen
                        </Link>
                        <button
                          type="button"
                          className="rounded-lg border border-sand-300 px-3 py-1.5 text-[12px] font-semibold text-sand-700 transition hover:border-sand-400"
                        >
                          Rückfrage
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Rückfragen-Prinzip */}
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-sand-900">
              Rückfragen statt E-Mail-Ping-Pong
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-sand-700">
              Eine Rückfrage hängt direkt an der Buchung und erscheint beim
              Mandanten als Prüflisten-Karte („Ihre Kanzlei fragt: …"). Die
              Antwort fließt zurück, der Verlauf bleibt an der Buchung — und
              der Autopilot lernt daraus für alle künftigen Fälle.
            </p>
          </section>
          <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-sand-900">
              Mandanten einladen statt einsammeln
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-sand-700">
              Neue Pflege-Mandate starten über Ihren Einladungslink direkt im
              vorkonfigurierten Onboarding (SKR45, § 4 Nr. 16, Ihre
              DATEV-Mandantennummer bereits hinterlegt). Nach 30 Minuten
              liefert das Mandat vorkontierte, Cent-geprüfte Monate.
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-block text-[13px] font-semibold text-brand-700 underline"
            >
              Onboarding ansehen →
            </Link>
          </section>
        </div>

        <p className="text-[12px] text-sand-500">
          Demo-Ansicht mit Beispiel-Mandaten. Rollenmodell &amp; Spezifikation:
          PRODUKT.md § 1.
        </p>
      </main>
    </div>
  );
}
