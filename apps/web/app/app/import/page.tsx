"use client";

/* Bank-Import — ECHT: CSV-Datei hochladen → Import + Kontierung + Autopilot
   laufen serverseitig in einem Zug. Das Ergebnis („X automatisch gebucht")
   ist der Magic Moment aus dem Onboarding — hier mit echten Zahlen. */

import Link from "next/link";
import { useRef, useState } from "react";
import { getOrgId, uploadDatei, type ImportErgebnis } from "@/lib/client";

export default function BankImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ziehen, setZiehen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null);

  async function hochladen(datei: File) {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    setErgebnis(null);
    setLaedt(true);
    try {
      const r = await uploadDatei<ImportErgebnis>(`/orgs/${org}/bank/upload`, datei);
      setErgebnis(r);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">
          Bank-Import
        </h1>
        <p className="mt-1 text-[14px] text-sand-600">
          CSV-Export aus dem Online-Banking (Sparkasse, VR, comdirect …)
          hochladen — bereits importierte Umsätze werden automatisch erkannt
          und übersprungen, doppelt geht nichts.
        </p>
      </div>

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
        className={
          "block w-full rounded-3xl border-2 border-dashed px-8 py-14 text-center transition " +
          (ziehen
            ? "border-brand-600 bg-brand-50"
            : "border-sand-300 bg-white hover:border-brand-400 hover:bg-brand-50/40")
        }
      >
        <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-xl text-brand-700">
          ⇣
        </span>
        <p className="mt-3 text-[15px] font-semibold text-sand-900">
          {laedt ? "Verarbeite …" : "CSV hierher ziehen oder klicken"}
        </p>
        <p className="mt-1 text-[13px] text-sand-500">
          Kontoumsätze als CSV, max. 10 MB
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) hochladen(f);
          e.target.value = "";
        }}
      />

      {fehler && (
        <p className="rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      {ergebnis && (
        <section className="rise rounded-3xl border border-brand-200 bg-white p-7 shadow-sm">
          <p className="flex items-center gap-2 text-[15px] font-bold text-sand-900">
            <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-status-good-bg text-status-good">✓</span>
            Import fertig — der Autopilot hat direkt mitgearbeitet.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { wert: ergebnis.neu, label: "Umsätze neu" },
              { wert: ergebnis.uebersprungen, label: "schon bekannt" },
              { wert: ergebnis.auto_gebucht, label: "automatisch gebucht", gut: true },
              { wert: ergebnis.vorgeschlagen - ergebnis.auto_gebucht, label: "zur Prüfung" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-sand-50 px-4 py-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                  {k.label}
                </dt>
                <dd className={"tnum mt-1 text-2xl font-bold " + (k.gut ? "text-status-good" : "text-sand-900")}>
                  {k.wert}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/app/pruefliste/"
              className="rounded-xl bg-brand-700 px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-brand-800"
            >
              Zur Prüfliste
            </Link>
            <Link
              href="/app/"
              className="rounded-xl border border-sand-300 px-5 py-2.5 text-[13.5px] font-semibold text-sand-700 transition hover:border-brand-600 hover:text-brand-700"
            >
              Zur Übersicht
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
