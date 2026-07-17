"use client";

/* Kanzlei-Cockpit — ECHT: Mandate mit Cent-Anker/offenen Punkten/Stapeln
   aus der API, sortiert nach Handlungsbedarf (Server sortiert). */

import { useEffect, useState } from "react";
import { api, setOrgId, type CockpitZeile, type Ich } from "@/lib/client";
import { useRouter } from "next/navigation";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const JAHR = 2026;

export default function Cockpit() {
  const router = useRouter();
  const [zeilen, setZeilen] = useState<CockpitZeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    api.get<Ich>("/auth/ich")
      .then((ich) => {
        const kanzlei = ich.orgs.find((o) => o.art === "kanzlei");
        if (!kanzlei) throw new Error("Kein Kanzlei-Zugang auf diesem Konto.");
        return api.get<{ mandate: CockpitZeile[] }>(
          `/kanzlei/${kanzlei.org_id}/cockpit?jahr=${JAHR}`,
        );
      })
      .then((r) => setZeilen(r.mandate))
      .catch((e) => setFehler(e.message));
  }, []);

  function oeffnen(z: CockpitZeile) {
    setOrgId(z.org_id);
    router.push("/app/");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">
          Kanzlei-Cockpit
        </h1>
        <p className="mt-1 text-[14px] text-sand-600">
          Alle Pflege-Mandate — sortiert nach Handlungsbedarf.
        </p>
      </div>

      {fehler && (
        <p className="rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      <section className="overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead>
            <tr className="border-b border-sand-100 text-left text-[11px] font-semibold uppercase tracking-wider text-sand-500">
              <th className="px-5 py-3.5">Mandat</th>
              <th className="px-3 py-3.5">Cent-Anker</th>
              <th className="px-3 py-3.5 text-right">Beim Mandanten</th>
              <th className="px-3 py-3.5">Stapel</th>
              <th className="px-3 py-3.5 text-right">Rückfragen</th>
              <th className="px-5 py-3.5 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {(zeilen ?? []).map((z) => (
              <tr key={z.org_id} className="transition hover:bg-sand-50">
                <td className="px-5 py-4 font-semibold text-sand-900">{z.name}</td>
                <td className="px-3 py-4">
                  {z.anker_ok == null ? (
                    <span className="text-sand-400">—</span>
                  ) : z.anker_ok ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-good-bg px-2.5 py-1 text-[12px] font-semibold text-status-good">
                      ✓ {z.anker_monat ? MONATE[z.anker_monat - 1] : ""} Cent-genau
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-crit-bg px-2.5 py-1 text-[12px] font-semibold text-status-crit">
                      Δ Abweichung
                    </span>
                  )}
                </td>
                <td className="tnum px-3 py-4 text-right text-sand-700">
                  {z.offen === 0 ? (
                    <span className="text-status-good">✓ nichts</span>
                  ) : (
                    `${z.offen} offen`
                  )}
                </td>
                <td className="px-3 py-4">
                  {z.stapel_status === "uebernommen" && (
                    <span className="font-semibold text-status-good">✓ übernommen</span>
                  )}
                  {z.stapel_status === "exportiert" && (
                    <span className="font-semibold text-brand-700">exportiert</span>
                  )}
                  {z.stapel_status === "erstellt" && (
                    <span className="font-semibold text-amber-acc">● bereit</span>
                  )}
                  {!z.stapel_status && <span className="text-sand-400">—</span>}
                </td>
                <td className="tnum px-3 py-4 text-right">
                  {z.rueckfragen_offen > 0 ? (
                    <span className="rounded-full bg-status-warn-bg px-2.5 py-1 text-[12px] font-bold text-status-warn">
                      {z.rueckfragen_offen}
                    </span>
                  ) : (
                    <span className="text-sand-400">0</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => oeffnen(z)}
                    className="rounded-lg border border-sand-300 px-3 py-1.5 text-[12px] font-semibold text-sand-700 transition hover:border-brand-600 hover:text-brand-700"
                  >
                    Mandat öffnen
                  </button>
                </td>
              </tr>
            ))}
            {zeilen && zeilen.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sand-500">
                  Noch keine Mandate — laden Sie Ihr erstes Unternehmen ein.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
