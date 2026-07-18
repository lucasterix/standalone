"use client";

/* Belege — Upload mit direktem Matching gegen die Banktransaktionen.
   Text-PDFs werden serverseitig gelesen (Betrag/Datum/Rechnungs-Nr.);
   bei genau einem passenden Umsatz ordnet das System selbst zu, sonst
   entscheidet ein Klick aus der Kandidatenliste. */

import { useCallback, useEffect, useRef, useState } from "react";
import { api, datumKurz, euro, getOrgId } from "@/lib/client";

type Tx = { id: number; datum: string; betrag: string; name: string; zweck: string };

type Beleg = {
  id: number; art: string; datei_name: string | null; lieferant: string | null;
  rechnungs_nr: string | null; datum: string | null;
  betrag_brutto: string | null; status: string;
  tx: Tx | null; kandidaten: Tx[];
};

export default function Belege() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [liste, setListe] = useState<Beleg[] | null>(null);
  const [betrag, setBetrag] = useState("");
  const [ziehen, setZiehen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Beleg[]>(`/orgs/${org}/belege`)
      .then(setListe)
      .catch((e) => setFehler(e.message));
  }, []);
  useEffect(laden, [laden]);

  function meldung(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 3600);
  }

  async function hochladen(datei: File) {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    setLaedt(true);
    try {
      const form = new FormData();
      form.append("datei", datei);
      if (betrag.trim()) form.append("betrag", betrag.trim());
      const res = await fetch(`/api/orgs/${org}/belege/upload`, {
        method: "POST", credentials: "same-origin", body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Upload fehlgeschlagen");
      const b = await res.json();
      meldung(
        b.status === "zugeordnet"
          ? `Zugeordnet: ${b.tx.name}, ${datumKurz(b.tx.datum)} (${euro(b.tx.betrag)}).`
          : b.kandidaten.length > 0
            ? `${b.kandidaten.length} mögliche Umsätze gefunden — bitte unten wählen.`
            : b.betrag
              ? "Kein passender Umsatz — bleibt als offener Beleg liegen."
              : "Hochgeladen — Betrag angeben oder unten zuordnen.",
      );
      setBetrag("");
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLaedt(false);
    }
  }

  async function zuordnen(b: Beleg, txId: number) {
    const org = getOrgId();
    if (!org) return;
    await api.post(`/orgs/${org}/belege/${b.id}/zuordnen`, { tx_id: txId });
    meldung("Zugeordnet.");
    laden();
  }

  async function loesen(b: Beleg) {
    const org = getOrgId();
    if (!org) return;
    await api.post(`/orgs/${org}/belege/${b.id}/loesen`);
    laden();
  }

  const offen = (liste ?? []).filter((b) => b.status !== "zugeordnet" && b.status !== "verbucht");
  const fertig = (liste ?? []).filter((b) => b.status === "zugeordnet" || b.status === "verbucht");

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Belege</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Rechnung hochladen — Text-PDFs liest das System selbst und hängt
          sie direkt an den passenden Bankumsatz.
        </p>
      </div>

      {/* Upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setZiehen(true); }}
        onDragLeave={() => setZiehen(false)}
        onDrop={(e) => {
          e.preventDefault();
          setZiehen(false);
          const f = e.dataTransfer.files?.[0];
          if (f) hochladen(f);
        }}
        disabled={laedt}
        className="tile block w-full p-3 text-left transition"
      >
        <span className={
          "block rounded-[20px] border-2 border-dashed px-8 py-10 text-center transition " +
          (ziehen ? "border-brand-600 bg-brand-50" : "border-sand-300 hover:border-brand-400 hover:bg-brand-50/40")
        }>
          <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-700">⎘</span>
          <span className="mt-3 block text-[15px] font-semibold text-ink">
            {laedt ? "Lese und suche passenden Umsatz …" : "Beleg hierher ziehen oder klicken"}
          </span>
          <span className="mt-1 block text-[13px] text-ink-soft">
            PDF, JPG oder PNG · max. 10 MB
          </span>
        </span>
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) hochladen(f); e.target.value = ""; }} />
      <div className="flex items-center gap-3 px-1">
        <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
          Betrag (hilft bei Fotos/Scans):
          <input
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="z. B. 88,20"
            className="tnum w-28 rounded-full border border-sand-300 bg-white px-3.5 py-1.5 text-[13px] font-semibold focus:border-brand-600 focus:outline-none"
          />
        </label>
      </div>

      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {/* Offene Belege mit Kandidaten */}
      {offen.length > 0 && (
        <section className="tile tile-apricot p-6">
          <h2 className="font-display text-lg font-semibold text-tile-apricot-ink">
            Noch zuzuordnen
          </h2>
          <div className="mt-3 space-y-2">
            {offen.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {b.datei_name ?? `Beleg ${b.id}`}
                  </span>
                  {b.betrag_brutto && <span className="tnum chip chip-apricot">{euro(b.betrag_brutto)}</span>}
                  {b.rechnungs_nr && <span className="tnum text-[11.5px] text-sand-500">{b.rechnungs_nr}</span>}
                  <a href={`/api/orgs/${getOrgId()}/belege/${b.id}/datei`} target="_blank" rel="noreferrer"
                    className="text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline">
                    ansehen
                  </a>
                </div>
                {b.kandidaten.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {b.kandidaten.map((t) => (
                      <button key={t.id} type="button" onClick={() => zuordnen(b, t.id)}
                        className="zeile-soft flex w-full flex-wrap items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-brand-50">
                        <span className="tnum w-16 text-[12px] text-ink-soft">{datumKurz(t.datum)}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{t.name}</span>
                        <span className="tnum text-[13px] font-bold">{euro(t.betrag)}</span>
                        <span className="text-[11.5px] font-bold text-brand-700">Zuordnen →</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[12.5px] text-ink-soft">
                    {b.betrag_brutto
                      ? "Kein Umsatz mit diesem Betrag gefunden — vielleicht kommt die Abbuchung noch."
                      : "Kein Betrag erkannt — beim nächsten Upload den Betrag mit angeben."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Zugeordnete */}
      <section className="tile p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Zugeordnet</h2>
        {liste == null ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">Lade …</p>
        ) : fertig.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">
            Noch keine — der erste zugeordnete Beleg erscheint hier mit seinem Bankumsatz.
          </p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {fertig.map((b) => (
              <div key={b.id} className="zeile-soft flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span aria-hidden className="text-[14px]">📎</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                  {b.datei_name ?? b.lieferant ?? `Beleg ${b.id}`}
                </span>
                {b.tx && (
                  <span className="tnum truncate text-[12.5px] text-ink-soft">
                    → {datumKurz(b.tx.datum)} · {b.tx.name} · {euro(b.tx.betrag)}
                  </span>
                )}
                <a href={`/api/orgs/${getOrgId()}/belege/${b.id}/datei`} target="_blank" rel="noreferrer"
                  className="text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline">
                  ansehen
                </a>
                {b.status !== "verbucht" && (
                  <button type="button" onClick={() => loesen(b)}
                    className="text-[12px] font-semibold text-sand-500 hover:text-status-crit">
                    lösen
                  </button>
                )}
              </div>
            ))}
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
