"use client";

/* Einstellungen des Buchungsalgorithmus — Kernprinzip aus der Recherche:
   JEDE Einstellung zeigt ihre Folge in Zahlen (Simulation), bevor man sie
   speichert. Kein Wettbewerber macht das. */

import { useCallback, useEffect, useState } from "react";
import { api, getOrgId } from "@/lib/client";

type Einstellungen = {
  autopilot_stufe: string;
  lern_schwelle: number;
  kostentraeger_modus: boolean;
  lohn_muster_aktiv: boolean;
  fallback_erloes: string | null;
  fallback_aufwand: string | null;
  fallback_erloes_default: string;
  fallback_aufwand_default: string;
  datev_berater_nr: string | null;
  datev_mandant_nr: string | null;
  chart: string;
};

type Simulation = { offen: number; stufen: Record<string, number> };

type Regel = {
  id: number; konto: string; aktiv: boolean; quelle: string;
  partner: string; partner_nr: string | null; gebucht: number;
};

const STUFEN = [
  {
    key: "vorsichtig", name: "Vorsichtig",
    text: "Nur Zahlungen auf offene Posten und Kostenträger-Eingänge — alles andere fragt nach.",
  },
  {
    key: "ausgewogen", name: "Ausgewogen", empfohlen: true,
    text: "Zusätzlich Ihre Partner-Regeln und sicher gelernte Muster (ab 90 % Konfidenz).",
  },
  {
    key: "mutig", name: "Mutig",
    text: "Zusätzlich Buchungshistorie ab 75 % Konfidenz — maximale Automatik, mehr Stichproben empfohlen.",
  },
];

const KARTE = "tile p-6";
const H2 = "font-display text-lg font-semibold text-sand-900";
const FELD = "tnum mt-1.5 w-28 rounded-2xl border border-sand-300 bg-white px-3 py-2 text-[14px] font-semibold focus:border-brand-600 focus:outline-none";

export default function EinstellungenSeite() {
  const [est, setEst] = useState<Einstellungen | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [regeln, setRegeln] = useState<Regel[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Einstellungen>(`/orgs/${org}/einstellungen`).then(setEst).catch((e) => setFehler(e.message));
    api.get<Simulation>(`/orgs/${org}/autopilot/simulation`).then(setSim).catch(() => null);
    api.get<Regel[]>(`/orgs/${org}/regeln`).then(setRegeln).catch(() => setRegeln([]));
  }, []);
  useEffect(laden, [laden]);

  async function speichern(patch: Partial<Einstellungen>, meldung = "Gespeichert.") {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    try {
      const neu = await api.patch<Einstellungen>(`/orgs/${org}/einstellungen`, patch);
      setEst(neu);
      setToast(meldung);
      window.setTimeout(() => setToast(null), 2600);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function regelToggle(r: Regel) {
    await api.patch(`/regeln/${r.id}`, { aktiv: !r.aktiv });
    laden();
  }

  async function nachbuchen() {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    try {
      const res = await api.post<{ bestaetigt: number }>(`/orgs/${org}/autopilot/run`);
      setToast(`${res.bestaetigt} Buchungen nachgebucht — Prüfliste entsprechend kleiner.`);
      window.setTimeout(() => setToast(null), 4000);
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function notAus() {
    const org = getOrgId();
    if (!org) return;
    const res = await api.post<{ zurueckgeholt: number }>(`/orgs/${org}/autopilot/revert`);
    setToast(`${res.zurueckgeholt} automatische Buchungen zurück in die Prüfliste.`);
    window.setTimeout(() => setToast(null), 4000);
    laden();
  }

  if (!est) {
    return <main className="px-6 py-7 text-[14px] text-sand-500">{fehler ?? "Lade …"}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Einstellungen</h1>
        <p className="mt-1 text-[14px] text-sand-600">
          Der Buchungsalgorithmus, einstellbar — jede Option zeigt vorher, was
          sie bewirken würde.
        </p>
      </div>

      {fehler && (
        <p className="rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {/* Autopilot-Stufe mit Simulation */}
      <section className={KARTE}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={H2}>Autopilot-Stufe</h2>
          {sim && (
            <p className="text-[13px] text-sand-600">
              Offen in der Prüfliste: <strong className="tnum">{sim.offen}</strong>
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {STUFEN.map((s) => {
            const aktiv = est.autopilot_stufe === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => speichern({ autopilot_stufe: s.key }, `Autopilot: ${s.name}.`)}
                aria-pressed={aktiv}
                className={
                  "rounded-[20px] border-2 p-4 text-left transition " +
                  (aktiv
                    ? "border-brand-600 bg-brand-50/60"
                    : "border-sand-200 bg-white hover:border-brand-300")
                }
              >
                <p className="flex items-center gap-2 text-[14.5px] font-bold text-sand-900">
                  {s.name}
                  {s.empfohlen && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-semibold text-brand-800">
                      Empfohlen
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-sand-600">{s.text}</p>
                {sim && (
                  <p className="tnum mt-3 border-t border-sand-200 pt-2.5 text-[12.5px] font-semibold text-brand-800">
                    Würde jetzt {sim.stufen[s.key]} von {sim.offen} buchen
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {sim && est && (sim.stufen[est.autopilot_stufe] ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-tile-mint px-4 py-3">
            <p className="text-[13.5px] text-tile-mint-ink">
              Die Stufe <strong>{STUFEN.find((s) => s.key === est.autopilot_stufe)?.name}</strong>{" "}
              würde <strong className="tnum">{sim.stufen[est.autopilot_stufe]}</strong> der{" "}
              <span className="tnum">{sim.offen}</span> offenen Fälle sofort buchen.
            </p>
            <button
              type="button"
              onClick={nachbuchen}
              className="knopf knopf-primaer px-5 py-2 text-[13px]"
            >
              Jetzt nachbuchen
            </button>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand-100 pt-4">
          <p className="text-[12.5px] text-sand-500">
            Alles Automatische ist markiert und umkehrbar — der Fallback wird nie automatisch gebucht.
          </p>
          <button
            type="button"
            onClick={notAus}
            className="knopf knopf-kontur shrink-0 px-5 py-2 text-[12.5px]"
          >
            Not-Aus: letzten Lauf zurückholen
          </button>
        </div>
      </section>

      {/* Buchungslogik */}
      <section className={KARTE}>
        <h2 className={H2}>Buchungslogik</h2>
        <div className="mt-4 space-y-4">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-[14px] font-semibold text-sand-900">Kostenträger-Modus</span>
              <span className="block text-[12.5px] text-sand-600">
                Eingänge bekannter Kostenträger buchen als „Bank an Personenkonto" — der Erlös folgt aus der Rechnung. Kern der Pflege-Fibu.
              </span>
            </span>
            <input
              type="checkbox"
              checked={est.kostentraeger_modus}
              onChange={(e) => speichern({ kostentraeger_modus: e.target.checked })}
              className="mt-1 h-5 w-5 accent-[var(--color-brand-700)]"
            />
          </label>
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-[14px] font-semibold text-sand-900">Lohn/Gehalt-Muster</span>
              <span className="block text-[12.5px] text-sand-600">
                Ausgaben mit „Lohn/Gehalt" im Zweck automatisch auf das Lohn-Verrechnungskonto.
              </span>
            </span>
            <input
              type="checkbox"
              checked={est.lohn_muster_aktiv}
              onChange={(e) => speichern({ lohn_muster_aktiv: e.target.checked })}
              className="mt-1 h-5 w-5 accent-[var(--color-brand-700)]"
            />
          </label>
          <div className="flex flex-wrap items-end gap-6 border-t border-sand-100 pt-4">
            <label>
              <span className="block text-[13px] font-semibold text-sand-700">Lern-Schwelle</span>
              <select
                value={est.lern_schwelle}
                onChange={(e) => speichern({ lern_schwelle: Number(e.target.value) },
                  "Lern-Schwelle gespeichert.")}
                className={FELD}
              >
                {[2, 3, 5].map((n) => <option key={n} value={n}>{n}×</option>)}
              </select>
              <span className="mt-1 block max-w-[240px] text-[11.5px] text-sand-500">
                Nach so vielen gleichen Bestätigungen bucht der Autopilot den Partner künftig selbst.
              </span>
            </label>
            <label>
              <span className="block text-[13px] font-semibold text-sand-700">Fallback Erlös</span>
              <input
                defaultValue={est.fallback_erloes ?? ""}
                placeholder={est.fallback_erloes_default}
                onBlur={(e) => {
                  const w = e.target.value.trim();
                  if (w !== (est.fallback_erloes ?? "")) speichern({ fallback_erloes: w || null });
                }}
                className={FELD}
              />
            </label>
            <label>
              <span className="block text-[13px] font-semibold text-sand-700">Fallback Aufwand</span>
              <input
                defaultValue={est.fallback_aufwand ?? ""}
                placeholder={est.fallback_aufwand_default}
                onBlur={(e) => {
                  const w = e.target.value.trim();
                  if (w !== (est.fallback_aufwand ?? "")) speichern({ fallback_aufwand: w || null });
                }}
                className={FELD}
              />
            </label>
            <p className="max-w-[220px] text-[11.5px] text-sand-500">
              Wohin Unerkanntes <em>vorgeschlagen</em> wird — automatisch gebucht wird es nie.
            </p>
          </div>
        </div>
      </section>

      {/* Partner-Regeln */}
      <section className="tile tile-lavender p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-bold text-tile-lavender-ink">Partner-Regeln</h2>
          <p className="text-[12.5px] font-medium text-tile-lavender-ink/80">
            Entstehen aus „künftig immer so buchen" in der Prüfliste
          </p>
        </div>
        {regeln && regeln.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {regeln.map((r) => (
              <div
                key={r.id}
                className={
                  "zeile-soft flex flex-wrap items-center justify-between gap-3 bg-white! px-4 py-3 " +
                  (r.aktiv ? "" : "opacity-50")
                }
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">
                    {r.partner}
                    <span className="tnum ml-2 text-[11.5px] font-normal text-ink-soft">{r.partner_nr}</span>
                  </p>
                  <p className="tnum mt-0.5 text-[12px] text-ink-soft">
                    Konto {r.konto} · Hat erledigt:{" "}
                    {r.gebucht > 0 ? `${r.gebucht.toLocaleString("de-DE")} Buchungen` : "—"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                  Aktiv
                  <input
                    type="checkbox"
                    checked={r.aktiv}
                    onChange={() => regelToggle(r)}
                    className="h-4.5 w-4.5 accent-[var(--color-brand-700)]"
                  />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] font-medium text-tile-lavender-ink/80">
            Noch keine Regeln — bestätigen Sie in der Prüfliste mit „künftig immer so buchen".
          </p>
        )}
      </section>

      {/* DATEV-Stammdaten */}
      <section className="tile tile-rose p-6">
        <h2 className="text-[14px] font-bold text-tile-rose-ink">DATEV-Stammdaten</h2>
        <p className="mt-1 text-[12.5px] font-medium text-tile-rose-ink/80">
          Stehen im Kopf jeder EXTF-Datei — Ihre Kanzlei nennt Ihnen beide Nummern.
          Kontenrahmen: <strong>{est.chart.toUpperCase()}</strong>.
        </p>
        <div className="mt-3 flex flex-wrap gap-6">
          <label>
            <span className="block text-[13px] font-semibold text-tile-rose-ink">Berater-Nr.</span>
            <input
              defaultValue={est.datev_berater_nr ?? ""}
              onBlur={(e) => {
                const w = e.target.value.trim();
                if (w !== (est.datev_berater_nr ?? "")) speichern({ datev_berater_nr: w || null });
              }}
              className={FELD}
            />
          </label>
          <label>
            <span className="block text-[13px] font-semibold text-tile-rose-ink">Mandanten-Nr.</span>
            <input
              defaultValue={est.datev_mandant_nr ?? ""}
              onBlur={(e) => {
                const w = e.target.value.trim();
                if (w !== (est.datev_mandant_nr ?? "")) speichern({ datev_mandant_nr: w || null });
              }}
              className={FELD}
            />
          </label>
        </div>
      </section>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-brand-200 bg-white px-5 py-3 shadow-xl">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-sand-900">
            <span className="text-status-good" aria-hidden>✓</span>{toast}
          </p>
        </div>
      )}
    </main>
  );
}
