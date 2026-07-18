"use client";

/* Prüfliste — ECHT: offene Vorschläge aus der API, Buchen/Ändern/Ablehnen
   per PATCH, „immer so buchen" lernt eine Partner-Regel.
   Look: Bento 2.0 (docs/DESIGN-BENTO.md) — Karten als weiße Kacheln. */

import { useCallback, useEffect, useState } from "react";
import { api, getOrgId, type JournalZeile, euro, datumKurz } from "@/lib/client";

export default function Pruefliste() {
  const [zeilen, setZeilen] = useState<JournalZeile[] | null>(null);
  const [offenId, setOffenId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesamt, setGesamt] = useState<number | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<JournalZeile[]>(`/orgs/${org}/journal?status=vorgeschlagen&limit=1000`)
      .then((r) => {
        setZeilen(r);
        setGesamt((g) => g ?? r.length);
      })
      .catch((e) => setFehler(e.message));
  }, []);
  useEffect(laden, [laden]);

  async function entscheiden(
    j: JournalZeile,
    patch: { status?: string; konto?: string; als_regel?: boolean },
  ) {
    setFehler(null);
    try {
      await api.patch(`/journal/${j.id}`, patch);
      setZeilen((z) => (z ?? []).filter((x) => x.id !== j.id));
      setOffenId(null);
      setToast(
        patch.als_regel
          ? "Gebucht — Regel gelernt, ab jetzt bucht das der Autopilot."
          : patch.status === "abgelehnt"
            ? "Abgelehnt — taucht nicht mehr auf."
            : "Gebucht.",
      );
      window.setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    }
  }

  const erledigt = gesamt != null && zeilen != null ? gesamt - zeilen.length : 0;

  return (
    <main
      className="mx-auto max-w-4xl space-y-5 px-6 py-7"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Prüfliste
          </h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            {zeilen == null
              ? "Lade …"
              : zeilen.length === 0
                ? "Alles entschieden — der Rest lief automatisch."
                : `${zeilen.length} Entscheidungen — alles andere hat der Autopilot erledigt.`}
          </p>
        </div>
        {gesamt != null && gesamt > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-36 overflow-hidden rounded-full bg-white shadow-inner">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${(erledigt / gesamt) * 100}%` }}
              />
            </div>
            <span className="tnum text-[13px] font-semibold text-ink">
              {erledigt}/{gesamt}
            </span>
          </div>
        )}
      </div>

      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      {zeilen && zeilen.length === 0 ? (
        <div className="tile tile-mint px-8 py-16 text-center">
          <span
            aria-hidden
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-tile-mint-deep shadow-sm"
          >
            ✓
          </span>
          <h2 className="font-display mt-4 text-xl font-semibold text-tile-mint-ink">
            Alles erledigt.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-[#3f7a63]">
            Sobald der Monat Cent-genau ist, wartet der DATEV-Stapel unter{" "}
            <a href="/app/datev/" className="font-semibold text-brand-700 underline">DATEV</a>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(zeilen ?? []).map((j) => (
            <Karte
              key={j.id}
              j={j}
              offen={offenId === j.id}
              onToggle={() => setOffenId(offenId === j.id ? null : j.id)}
              onEntscheiden={(p) => entscheiden(j, p)}
            />
          ))}
        </ul>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-3 shadow-xl">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <span className="text-status-good" aria-hidden>✓</span>
            {toast}
          </p>
        </div>
      )}
    </main>
  );
}

function Karte({ j, offen, onToggle, onEntscheiden }: {
  j: JournalZeile;
  offen: boolean;
  onToggle: () => void;
  onEntscheiden: (p: { status?: string; konto?: string; als_regel?: boolean }) => void;
}) {
  const einnahme = j.richtung === "einnahme";
  const gegenkonto = einnahme ? j.haben : j.soll;
  const [konto, setKonto] = useState(gegenkonto);
  const [regel, setRegel] = useState(Boolean(j.partner_nr));

  return (
    <li className="tile overflow-hidden rounded-[28px]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        className="flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 px-6 py-4 text-left transition hover:bg-[#f7f5f1]"
      >
        <span className="tnum w-20 shrink-0 text-[12px] text-ink-soft">{datumKurz(j.datum)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">
            {j.partner || j.text || "Umsatz"}
          </span>
          <span className="block truncate text-[12.5px] text-ink-soft">
            {j.begruendung}
          </span>
        </span>
        <span className={
          "tnum shrink-0 text-[15px] font-bold " +
          (einnahme ? "text-status-good" : "text-ink")
        }>
          {einnahme ? "+" : "−"}{euro(j.betrag)}
        </span>
        <span aria-hidden className={"shrink-0 text-sand-400 transition-transform " + (offen ? "rotate-180" : "")}>▾</span>
      </button>

      {offen && (
        <div className="bg-[#f7f5f1] px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                {einnahme ? "Geld eingegangen auf" : "Bezahlt von"}
              </p>
              <div className="mt-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="tnum font-semibold text-ink">
                  {einnahme ? j.soll : j.haben} · Bank
                </p>
                <p className="mt-0.5 text-[12px] text-ink-soft">🔒 fixiert</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Gegenkonto
              </p>
              <input
                value={konto}
                onChange={(e) => setKonto(e.target.value.trim())}
                className="tnum mt-2 w-40 rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] font-semibold focus:border-brand-600 focus:outline-none"
              />
              <p className="mt-2 text-[12px] text-ink-soft">
                Vorschlag: <span className="tnum font-semibold">{gegenkonto}</span>{" "}
                ({j.origin}, Konfidenz {j.confidence})
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 pt-4">
                {j.partner_nr ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-sand-700">
                    <input
                      type="checkbox"
                      checked={regel}
                      onChange={(e) => setRegel(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-brand-700)]"
                    />
                    {j.partner} künftig immer so buchen
                  </label>
                ) : (
                  <span className="text-[12px] text-ink-soft">
                    Nach 3 gleichen Bestätigungen bucht das der Autopilot.
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEntscheiden({ status: "abgelehnt" })}
                    className="knopf knopf-kontur px-5 py-2.5 text-[13px]"
                  >
                    Ablehnen
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onEntscheiden({
                        status: "bestaetigt",
                        ...(konto !== gegenkonto ? { konto } : {}),
                        als_regel: regel && Boolean(j.partner_nr),
                      })
                    }
                    className="knopf knopf-primaer px-6 py-2.5 text-[13px]"
                  >
                    Buchen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
