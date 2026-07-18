"use client";

/* Übersicht — echte Zahlen aus der API (Cent-Anker, Prüfliste, Autopilot).
   Look: Bento 2.0 (docs/DESIGN-BENTO.md), Grid wie /design/c. */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getOrgId, type JournalZeile, type Saldo, euro, datumKurz } from "@/lib/client";

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
    <main
      className="mx-auto max-w-5xl space-y-4 px-6 py-7"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Hero: Autopilot-Quote */}
        <section className="tile-hero col-span-12 overflow-hidden p-8 lg:col-span-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-teal-100">
                Diesen Monat automatisch erledigt
              </p>
              <p className="zahl-hero mt-3 text-[72px]">{quote} %</p>
              <p className="mt-2 text-[15px] text-teal-50">
                {gebuchtGesamt} von {erfasstGesamt} Buchungen — nur{" "}
                <strong>{offen ? offen.length : "…"}</strong> brauchen Sie.
              </p>
              <Link
                href="/app/pruefliste"
                className="knopf knopf-hell mt-6 inline-block px-6 py-3 text-[14px]"
              >
                {offen ? offen.length : "…"} Entscheidungen treffen →
              </Link>
            </div>
            {/* Deko-Ringe */}
            <div aria-hidden className="relative hidden h-36 w-36 shrink-0 sm:block">
              <div className="absolute inset-0 rounded-full border-[10px] border-white/20" />
              <div className="absolute inset-4 rounded-full border-[10px] border-white/30" />
              <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white/15 text-[30px] backdrop-blur">
                🚀
              </div>
            </div>
          </div>
        </section>

        {/* Cent-Anker */}
        <section className="tile tile-mint col-span-12 p-7 lg:col-span-5">
          <p className="text-[13px] font-bold uppercase tracking-wider text-tile-mint-ink">
            Cent-Anker · {JAHR}
          </p>
          <p
            className={
              "zahl-hero mt-2 text-[46px] " +
              (aktueller && !aktueller.ok ? "text-status-crit" : "text-tile-mint-deep")
            }
          >
            {aktueller ? (aktueller.ok ? "0,00 €" : `${aktueller.diff_summe} €`) : "…"}
          </p>
          <p
            className={
              "mt-1 text-[13.5px] font-medium " +
              (aktueller && !aktueller.ok ? "text-status-crit" : "text-[#3f7a63]")
            }
          >
            {aktueller && !aktueller.ok
              ? "Abweichung zur Bank — bitte prüfen"
              : "Bank ↔ Buchhaltung, je Monat auf den Cent geprüft"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {MONATE.map((m, i) => {
              const d = saldo?.monate[i];
              const hatDaten = d && (d.tx_count > 0 || d.erfasst_count > 0);
              return (
                <span
                  key={m}
                  title={hatDaten ? `${d.tx_count} Umsätze` : undefined}
                  className={
                    "flex h-11 w-11 flex-col items-center justify-center rounded-2xl text-[10px] font-bold " +
                    (hatDaten
                      ? d.ok
                        ? "bg-white text-tile-mint-deep shadow-sm"
                        : "bg-white text-status-crit shadow-sm"
                      : "bg-white/45 text-sand-400")
                  }
                >
                  <span className="text-[13px]">
                    {hatDaten ? (d.ok ? "✓" : "Δ") : "–"}
                  </span>
                  {m}
                </span>
              );
            })}
          </div>
        </section>

        {/* Prüflisten-Vorschau */}
        <section className="tile col-span-12 p-7 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-bold text-ink">Als Nächstes für Sie 📋</p>
            <div className="flex items-center gap-3">
              {offen && offen.length > 0 && (
                <span className="chip chip-apricot">{offen.length} offen</span>
              )}
              <Link
                href="/app/pruefliste"
                className="text-[13px] font-semibold text-brand-700 underline"
              >
                Zur Prüfliste →
              </Link>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {(offen ?? []).slice(0, 5).map((j) => (
              <li
                key={j.id}
                className="zeile-soft flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <span className="tnum w-20 shrink-0 text-[12px] text-ink-soft">{datumKurz(j.datum)}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                  {j.partner || j.text}
                </span>
                <span className="tnum text-[13.5px] font-bold text-ink">
                  {euro(j.betrag)}
                </span>
              </li>
            ))}
            {offen && offen.length === 0 && (
              <li className="zeile-soft px-4 py-6 text-center text-[14px] text-ink-soft">
                ✓ Nichts offen — alles erledigt.
              </li>
            )}
          </ul>
        </section>

        {/* DATEV */}
        <section className="tile tile-rose col-span-12 flex flex-col justify-between p-7 lg:col-span-4">
          <div>
            <p className="text-[14px] font-bold text-tile-rose-ink">DATEV 📦</p>
            <p className="mt-2 text-[22px] font-extrabold leading-snug text-ink">
              {aktueller
                ? aktueller.datev_bereit
                  ? `${MONATE[aktueller.monat - 1]} ist bereit!`
                  : "Noch offen"
                : "…"}
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-[#a96b85]">
              {aktueller?.datev_bereit
                ? "Monat kann exportiert werden"
                : "erst Prüfliste leeren"}
            </p>
          </div>
          <Link
            href="/app/datev"
            className="knopf mt-4 block bg-[#96305c] py-2.5 text-center text-[13px] text-white"
          >
            Zum DATEV-Export
          </Link>
        </section>
      </div>
    </main>
  );
}
