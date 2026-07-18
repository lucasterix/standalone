"use client";

/* Klärungs-Assistent — Avatar unten rechts (Support-Widget-Muster).
   Poppt auf, wenn der Algorithmus bei niedriger Konfidenz glaubt, dass
   EINE einfache Frage viele offene Fälle löst. Jede Antwort bucht und
   lernt dauerhaft (Regel/Kundenkonto) — das steht auch dran.
   Portal auf document.body (Containing-Block-Falle vermeiden). */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { api, euro, getOrgId } from "@/lib/client";
import { LogoMark } from "@/components/logo";

type Frage = {
  typ: string;
  partner: string;
  partner_key: string;
  anzahl: number;
  summe: string;
  journal_ids: number[];
  frage: string;
  hinweis: string;
  vorschlaege: { konto: string; name: string }[];
};

export default function Assistent() {
  const pathname = usePathname();
  const [fragen, setFragen] = useState<Frage[]>([]);
  const [offen, setOffen] = useState(false);
  const [montiert, setMontiert] = useState(false);
  const [konto, setKonto] = useState("");
  const [sende, setSende] = useState(false);
  const [erfolg, setErfolg] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => setMontiert(true), []);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Frage[]>(`/orgs/${org}/assistent/fragen`)
      .then((f) => {
        setFragen(f);
        // Automatisch aufpoppen — aber pro Sitzung nur einmal aufdrängen.
        if (f.length > 0 && !window.sessionStorage.getItem("kk_assistent_spaeter")) {
          window.setTimeout(() => setOffen(true), 1200);
        }
      })
      .catch(() => setFragen([]));
  }, []);
  useEffect(laden, [laden, pathname]);

  const frage = fragen[0];

  async function antworten(payload: {
    konto?: string; ist_patient?: boolean;
  }) {
    const org = getOrgId();
    if (!org || !frage) return;
    setSende(true);
    setFehler(null);
    try {
      const res = await api.post<{ gebucht: number; gelernt: string | null }>(
        `/orgs/${org}/assistent/antwort`,
        {
          typ: frage.typ,
          partner_key: frage.partner_key,
          journal_ids: frage.journal_ids,
          ...payload,
        },
      );
      setErfolg(
        `${res.gebucht} ${res.gebucht === 1 ? "Buchung" : "Buchungen"} erledigt` +
        (res.gelernt ? ` — ${res.gelernt}.` : "."),
      );
      setKonto("");
      const rest = fragen.slice(1);
      setFragen(rest);
      window.setTimeout(() => {
        setErfolg(null);
        if (rest.length === 0) setOffen(false);
      }, 2400);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSende(false);
    }
  }

  function spaeter() {
    window.sessionStorage.setItem("kk_assistent_spaeter", "1");
    setOffen(false);
  }

  if (!montiert || fragen.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {offen && frage && (
        <div className="tile w-[380px] max-w-[calc(100vw-2.5rem)] p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
              <LogoMark className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-brand-700">
                Kurze Frage
              </p>
              <p className="mt-1 text-[14px] font-semibold leading-snug text-ink">
                {frage.frage}
              </p>
            </div>
          </div>

          {erfolg ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-tile-mint px-4 py-3 text-[13.5px] font-semibold text-tile-mint-ink">
              <span aria-hidden>✓</span>{erfolg}
            </p>
          ) : (
            <>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
                {frage.hinweis}
              </p>

              {frage.typ === "patient_zuzahlung" ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={sende}
                    onClick={() => antworten({ ist_patient: true })}
                    className="knopf knopf-primaer flex-1 py-2.5 text-[13.5px] disabled:opacity-50"
                  >
                    Ja, Patient/Kunde
                  </button>
                  <button
                    type="button"
                    disabled={sende}
                    onClick={spaeter}
                    className="knopf knopf-kontur px-4 py-2.5 text-[13.5px]"
                  >
                    Nein / später
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  {frage.vorschlaege.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {frage.vorschlaege.map((v) => (
                        <button
                          key={v.konto}
                          type="button"
                          disabled={sende}
                          onClick={() => antworten({ konto: v.konto })}
                          className="rounded-full border-2 border-sand-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-ink transition hover:border-brand-600 hover:text-brand-700 disabled:opacity-50"
                          title={`Konto ${v.konto}`}
                        >
                          {v.name} <span className="tnum text-sand-500">{v.konto}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={konto}
                      onChange={(e) => setKonto(e.target.value.trim())}
                      placeholder="oder Konto, z. B. 6060"
                      className="tnum w-full rounded-2xl border border-sand-300 bg-white px-4 py-2.5 text-[13.5px] font-semibold focus:border-brand-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={sende || konto.length !== 4}
                      onClick={() => antworten({ konto })}
                      className="knopf knopf-primaer px-5 py-2.5 text-[13.5px] disabled:opacity-40"
                    >
                      Buchen
                    </button>
                  </div>
                </div>
              )}

              {fehler && (
                <p className="mt-3 rounded-xl bg-status-crit-bg px-3.5 py-2 text-[12.5px] font-medium text-status-crit">
                  {fehler}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-[11.5px] text-sand-500">
                <span className="tnum">
                  {frage.anzahl} {frage.anzahl === 1 ? "Fall" : "Fälle"} · {euro(frage.summe)}
                  {fragen.length > 1 ? ` · noch ${fragen.length - 1} Fragen` : ""}
                </span>
                <button type="button" onClick={spaeter} className="font-semibold underline-offset-2 hover:underline">
                  Später
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-label={`Klärungs-Assistent: ${fragen.length} Fragen`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 shadow-lg shadow-brand-700/30 transition hover:bg-brand-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
          <LogoMark className="h-5 w-5" />
        </span>
        <span className="tnum absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-tile-apricot text-[12px] font-bold text-tile-apricot-ink shadow-sm">
          {fragen.length}
        </span>
      </button>
    </div>,
    document.body,
  );
}
