"use client";

/* Buchungsübersicht — ALLE Buchungen mit Filtern; das Gegenkonto lässt
   sich nachträglich ändern (Klick auf das Konto). In DATEV übernommene
   Sätze sind eingefroren (Festschreibungs-Logik) und tragen ein Schloss. */

import { useCallback, useEffect, useState } from "react";
import { api, datumKurz, euro, getOrgId, type JournalZeile } from "@/lib/client";

const JAHR = 2026;
const MONATE = ["Alle", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const STATUS_FILTER = [
  { key: "", label: "Alle" },
  { key: "bestaetigt", label: "Gebucht" },
  { key: "vorgeschlagen", label: "Zur Prüfung" },
  { key: "gebucht", label: "In DATEV" },
  { key: "abgelehnt", label: "Abgelehnt" },
];

function ViaBadge({ j }: { j: JournalZeile }) {
  if (j.status === "gebucht") {
    return <span className="chip bg-sand-100 text-sand-600">🔒 DATEV</span>;
  }
  if (j.status === "vorgeschlagen") {
    return <span className="chip chip-apricot">zur Prüfung</span>;
  }
  if (j.status === "abgelehnt") {
    return <span className="chip bg-status-crit-bg text-status-crit">abgelehnt</span>;
  }
  const via = j.entschieden_via;
  if (via === "auto") return <span className="chip chip-mint">Autopilot</span>;
  if (via === "assistent") return <span className="chip chip-mint">Assistent</span>;
  if (via === "kanzlei") return <span className="chip bg-tile-lavender text-tile-lavender-ink">Kanzlei</span>;
  return <span className="chip bg-tile-lavender text-tile-lavender-ink">von Ihnen</span>;
}

export default function Buchungen() {
  const [zeilen, setZeilen] = useState<JournalZeile[] | null>(null);
  const [status, setStatus] = useState("");
  const [monat, setMonat] = useState(0);
  const [suche, setSuche] = useState("");
  const [bearbeite, setBearbeite] = useState<number | null>(null);
  const [neuKonto, setNeuKonto] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    const p = new URLSearchParams({ limit: "1000", jahr: String(JAHR) });
    if (status) p.set("status", status);
    if (monat) p.set("monat", String(monat));
    if (suche.trim()) p.set("suche", suche.trim());
    api.get<JournalZeile[]>(`/orgs/${org}/journal?${p}`)
      .then(setZeilen)
      .catch((e) => setFehler(e.message));
  }, [status, monat, suche]);

  useEffect(() => {
    const t = window.setTimeout(laden, suche ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [laden, suche]);

  async function kontoSpeichern(j: JournalZeile) {
    setFehler(null);
    try {
      await api.patch(`/journal/${j.id}`, { konto: neuKonto });
      setBearbeite(null);
      setToast(`Konto geändert → ${neuKonto}.`);
      window.setTimeout(() => setToast(null), 2600);
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    }
  }

  const summe = (zeilen ?? []).reduce(
    (s, j) => s + (j.richtung === "einnahme" ? 1 : -1) * Number(j.betrag), 0);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Buchungen</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Alles, was gebucht ist — Klick aufs Gegenkonto korrigiert es.
          In DATEV übernommene Sätze sind eingefroren.
        </p>
      </div>

      {/* Filter-Zeile */}
      <div className="tile flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              aria-pressed={status === f.key}
              className={
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition " +
                (status === f.key
                  ? "bg-brand-700 text-white"
                  : "bg-sand-100 text-sand-600 hover:bg-sand-200")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={monat}
          onChange={(e) => setMonat(Number(e.target.value))}
          className="rounded-full border border-sand-300 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-sand-700 focus:border-brand-600 focus:outline-none"
        >
          {MONATE.map((m, i) => (
            <option key={m} value={i}>{i === 0 ? "Alle Monate" : `${m} ${JAHR}`}</option>
          ))}
        </select>
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Partner, Zweck oder Konto suchen …"
          className="min-w-[220px] flex-1 rounded-full border border-sand-300 bg-white px-4 py-1.5 text-[13px] focus:border-brand-600 focus:outline-none"
        />
        {zeilen && (
          <span className="tnum text-[12.5px] font-semibold text-ink-soft">
            {zeilen.length} Sätze · Saldo {euro(summe)}
          </span>
        )}
      </div>

      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {/* Liste */}
      <section className="tile p-4">
        {zeilen == null ? (
          <p className="p-3 text-[13.5px] text-ink-soft">Lade …</p>
        ) : zeilen.length === 0 ? (
          <p className="p-3 text-[13.5px] text-ink-soft">Keine Buchungen für diesen Filter.</p>
        ) : (
          <div className="space-y-1.5">
            {zeilen.map((j) => {
              const einnahme = j.richtung === "einnahme";
              const gegenkonto = einnahme ? j.haben : j.soll;
              const gesperrt = j.status === "gebucht";
              return (
                <div key={j.id} className="zeile-soft flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="tnum w-16 shrink-0 text-[12px] text-ink-soft">{datumKurz(j.datum)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {j.partner || j.text || "Umsatz"}
                    </span>
                    {j.begruendung && (
                      <span className="block truncate text-[11.5px] text-sand-500">{j.begruendung}</span>
                    )}
                  </span>
                  <ViaBadge j={j} />
                  {/* Gegenkonto: klickbar, außer gesperrt */}
                  {bearbeite === j.id ? (
                    <span className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={neuKonto}
                        onChange={(e) => setNeuKonto(e.target.value.trim())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && neuKonto.length >= 4) kontoSpeichern(j);
                          if (e.key === "Escape") setBearbeite(null);
                        }}
                        className="tnum w-24 rounded-full border-2 border-brand-600 bg-white px-3 py-1 text-[12.5px] font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={neuKonto.length < 4}
                        onClick={() => kontoSpeichern(j)}
                        className="knopf knopf-primaer px-3 py-1 text-[11.5px] disabled:opacity-40"
                      >
                        OK
                      </button>
                      <button type="button" onClick={() => setBearbeite(null)}
                        className="text-[14px] text-sand-400 hover:text-ink">×</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={gesperrt}
                      title={gesperrt
                        ? "In DATEV übernommen — nur per Storno über die Kanzlei"
                        : `Gegenkonto ändern (${einnahme ? j.soll : j.haben} bleibt Bank)`}
                      onClick={() => { setBearbeite(j.id); setNeuKonto(gegenkonto); }}
                      className={
                        "tnum rounded-full px-3 py-1 text-[12.5px] font-bold transition " +
                        (gesperrt
                          ? "cursor-not-allowed bg-sand-100 text-sand-400"
                          : "bg-white text-brand-800 shadow-sm hover:bg-brand-50")
                      }
                    >
                      {einnahme ? `${j.soll} → ${j.haben}` : `${j.soll} ← ${j.haben}`}
                    </button>
                  )}
                  <span className={
                    "tnum w-28 shrink-0 text-right text-[13.5px] font-bold " +
                    (einnahme ? "text-status-good" : "text-ink")
                  }>
                    {einnahme ? "+" : "−"}{euro(j.betrag)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-brand-200 bg-white px-5 py-3 shadow-xl">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <span className="text-status-good" aria-hidden>✓</span>{toast}
          </p>
        </div>
      )}
    </main>
  );
}
