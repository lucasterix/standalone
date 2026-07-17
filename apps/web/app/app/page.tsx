"use client";

/* Übersicht — echte Zahlen aus der API (Cent-Anker, Prüfliste, Autopilot). */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getOrgId, type JournalZeile, type Saldo } from "@/lib/client";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const JAHR = 2026;

export default function Uebersicht() {
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [offen, setOffen] = useState<JournalZeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Saldo>(`/orgs/${org}/saldenabgleich?jahr=${JAHR}`)
      .then(setSaldo)
      .catch((e) => setFehler(e.message));
    api.get<JournalZeile[]>(`/orgs/${org}/journal?status=vorgeschlagen&limit=1000`)
      .then(setOffen)
      .catch(() => setOffen([]));
  }, []);
  useEffect(laden, [laden]);

  const aktive = saldo?.monate.filter((m) => m.tx_count > 0 || m.erfasst_count > 0) ?? [];
  const aktueller = aktive.length ? aktive[aktive.length - 1] : null;
  const gebuchtGesamt = aktive.reduce((s, m) => s + m.erfasst_count - m.offen_count, 0);
  const erfasstGesamt = aktive.reduce((s, m) => s + m.erfasst_count, 0);
  const quote = erfasstGesamt ? Math.round((gebuchtGesamt / erfasstGesamt) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-7">
      {fehler && (
        <p className="rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      {/* Kacheln */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kachel label="Automatisch erledigt" wert={`${quote} %`}
                sub={`${gebuchtGesamt} von ${erfasstGesamt} Buchungen`} />
        <Kachel label="Zur Prüfung" warn
                wert={offen ? String(offen.length) : "…"}
                sub="wartet auf Ihre Entscheidung" link="/app/pruefliste" />
        <Kachel label={`Saldenabgleich ${aktueller ? MONATE[aktueller.monat - 1] : ""}`}
                good={aktueller?.ok}
                wert={aktueller ? (aktueller.ok ? "0,00 €" : `${aktueller.diff_summe} €`) : "…"}
                sub={aktueller ? `${aktueller.erfasst_count} / ${aktueller.tx_count} Umsätze` : ""} />
        <Kachel label="DATEV"
                wert={aktueller?.datev_bereit ? "bereit" : "offen"}
                sub={aktueller?.datev_bereit ? "Monat kann exportiert werden" : "erst Prüfliste leeren"}
                link="/app/datev" />
      </div>

      {/* Cent-Anker-Leiste */}
      <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-sand-900">
              Cent-Anker · Saldenabgleich {JAHR}
            </h2>
            <p className="mt-0.5 text-[13px] text-sand-600">
              Bank ↔ Buchhaltung, je Monat auf den Cent geprüft
            </p>
          </div>
          {saldo && (
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold " +
                (saldo.ok
                  ? "bg-status-good-bg text-status-good"
                  : "bg-status-warn-bg text-status-warn")
              }
            >
              {saldo.ok ? "✓ Alle Monate Cent-genau" : "Abweichungen — siehe Monate"}
            </span>
          )}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {MONATE.map((m, i) => {
            const d = saldo?.monate[i];
            const hatDaten = d && (d.tx_count > 0 || d.erfasst_count > 0);
            return (
              <div
                key={m}
                className={
                  "rounded-xl border px-2 py-3 text-center " +
                  (hatDaten
                    ? d.ok
                      ? "border-brand-100 bg-brand-50/60"
                      : "border-status-crit/40 bg-status-crit-bg"
                    : "border-sand-100 bg-sand-50/40")
                }
              >
                <p className="text-[11px] font-semibold text-sand-600">{m}</p>
                <p
                  className={
                    "mt-1 text-[13px] font-bold " +
                    (hatDaten
                      ? d.ok ? "text-status-good" : "text-status-crit"
                      : "text-sand-300")
                  }
                >
                  {hatDaten ? (d.ok ? "✓" : "Δ") : "–"}
                </p>
                {hatDaten && (
                  <p className="tnum text-[10px] text-sand-500">{d.tx_count} Tx</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Prüflisten-Vorschau */}
      <section className="rounded-2xl border border-sand-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-sand-100 px-6 py-4">
          <h2 className="font-semibold text-sand-900">Als Nächstes für Sie</h2>
          <Link href="/app/pruefliste" className="text-[13px] font-semibold text-brand-700 underline">
            Zur Prüfliste →
          </Link>
        </div>
        <ul className="divide-y divide-sand-100">
          {(offen ?? []).slice(0, 5).map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3">
              <span className="tnum w-20 shrink-0 text-[12px] text-sand-500">{j.datum}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-sand-900">
                {j.partner || j.text}
              </span>
              <span className="tnum text-[14px] font-semibold text-sand-900">
                {j.betrag} €
              </span>
            </li>
          ))}
          {offen && offen.length === 0 && (
            <li className="px-6 py-6 text-center text-[14px] text-sand-500">
              ✓ Nichts offen — alles erledigt.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Kachel({ label, wert, sub, good, warn, link }: {
  label: string; wert: string; sub: string;
  good?: boolean; warn?: boolean; link?: string;
}) {
  const inhalt = (
    <div className="h-full rounded-2xl border border-sand-200 bg-white p-5 shadow-sm transition hover:border-brand-300">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-sand-500">{label}</p>
      <p className={
        "tnum font-display mt-2 text-3xl font-bold " +
        (good ? "text-status-good" : warn ? "text-amber-acc" : "text-sand-900")
      }>
        {good && <span aria-hidden className="mr-1.5 align-[3px] text-xl">✓</span>}
        {wert}
      </p>
      <p className="mt-1 text-[13px] text-sand-600">{sub}</p>
    </div>
  );
  return link ? <Link href={link}>{inhalt}</Link> : inhalt;
}
