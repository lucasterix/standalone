"use client";

/* DATEV — ECHT: Monate mit datev_bereit → Stapel bauen → EXTF herunterladen
   → als übernommen markieren (setzt exakt die eingefrorenen Sätze auf
   „gebucht"). */

import { useCallback, useEffect, useState } from "react";
import {
  api, downloadDatei, getOrgId, type Saldo, type Stapel,
} from "@/lib/client";

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
  "August", "September", "Oktober", "November", "Dezember"];
const JAHR = 2026;

export default function Datev() {
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [stapel, setStapel] = useState<Stapel[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Saldo>(`/orgs/${org}/saldenabgleich?jahr=${JAHR}`)
      .then(setSaldo).catch((e) => setFehler(e.message));
    api.get<Stapel[]>(`/orgs/${org}/datev/stapel`)
      .then(setStapel).catch(() => setStapel([]));
  }, []);
  useEffect(laden, [laden]);

  async function bauen(monat: number) {
    const org = getOrgId();
    if (!org) return;
    setBusy(`bau-${monat}`);
    setFehler(null);
    try {
      const von = `${JAHR}-${String(monat).padStart(2, "0")}-01`;
      const letzter = new Date(JAHR, monat, 0).getDate();
      const bis = `${JAHR}-${String(monat).padStart(2, "0")}-${letzter}`;
      await api.post(`/orgs/${org}/datev/stapel`, { von, bis });
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  async function herunterladen(s: Stapel) {
    setBusy(`dl-${s.id}`);
    try {
      await downloadDatei(`/datev/stapel/${s.id}/extf`,
        `EXTF_Buchungsstapel_${s.von.slice(0, 7)}.csv`);
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Download fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  async function uebernommen(s: Stapel) {
    setBusy(`ok-${s.id}`);
    try {
      await api.post(`/datev/stapel/${s.id}/uebernommen`);
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  const bereit = (saldo?.monate ?? []).filter((m) => m.datev_bereit);
  const mitStapel = new Set(
    (stapel ?? []).map((s) => Number(s.von.slice(5, 7))),
  );

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">
          DATEV-Übergabe
        </h1>
        <p className="mt-1 text-[14px] text-sand-600">
          Stapel entstehen erst, wenn der Monat Cent-genau ist — Ihre Kanzlei
          importiert die EXTF-Datei und behält das letzte Wort.
        </p>
      </div>

      {fehler && (
        <p className="rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      {/* Bereite Monate ohne Stapel */}
      {bereit.filter((m) => !mitStapel.has(m.monat)).length > 0 && (
        <section className="tile tile-mint p-6">
          <p className="text-[14px] font-bold text-tile-mint-ink">
            Cent-geprüft und bereit zum Stapeln:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {bereit.filter((m) => !mitStapel.has(m.monat)).map((m) => (
              <button
                key={m.monat}
                type="button"
                disabled={busy === `bau-${m.monat}`}
                onClick={() => bauen(m.monat)}
                className="knopf knopf-primaer px-5 py-2.5 text-[13px] disabled:opacity-50"
              >
                {busy === `bau-${m.monat}`
                  ? "Baue …"
                  : `${MONATE[m.monat - 1]} stapeln (${m.erfasst_count} Buchungen)`}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stapel-Liste */}
      <section className="tile overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="border-b border-sand-100 text-left text-[11px] font-semibold uppercase tracking-wider text-sand-500">
              <th className="px-5 py-3.5">Zeitraum</th>
              <th className="px-3 py-3.5 text-right">Sätze</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {(stapel ?? []).map((s) => (
              <tr key={s.id} className="transition hover:bg-sand-50">
                <td className="px-5 py-4 font-semibold text-sand-900">
                  {MONATE[Number(s.von.slice(5, 7)) - 1]} {s.von.slice(0, 4)}
                </td>
                <td className="tnum px-3 py-4 text-right text-sand-700">
                  {s.saetze.toLocaleString("de-DE")}
                </td>
                <td className="px-3 py-4">
                  {s.status === "uebernommen" ? (
                    <span className="chip chip-mint">✓ übernommen</span>
                  ) : s.status === "exportiert" ? (
                    <span className="chip bg-tile-lavender text-tile-lavender-ink">exportiert</span>
                  ) : (
                    <span className="chip chip-apricot">● bereit</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    {s.status !== "uebernommen" && (
                      <>
                        <button
                          type="button"
                          disabled={busy === `dl-${s.id}`}
                          onClick={() => herunterladen(s)}
                          className="knopf knopf-primaer px-4 py-1.5 text-[12px] disabled:opacity-50"
                        >
                          EXTF herunterladen
                        </button>
                        {s.status === "exportiert" && (
                          <button
                            type="button"
                            disabled={busy === `ok-${s.id}`}
                            onClick={() => uebernommen(s)}
                            className="knopf knopf-kontur px-4 py-1.5 text-[12px] disabled:opacity-50"
                          >
                            Kanzlei hat importiert
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {stapel && stapel.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sand-500">
                  Noch keine Stapel — sobald ein Monat Cent-genau und
                  vollständig bestätigt ist, erscheint er oben.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
