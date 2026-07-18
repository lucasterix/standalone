"use client";

/* Bank-Import — ECHT: CSV-Datei hochladen → Import + Kontierung + Autopilot
   laufen serverseitig in einem Zug. Das Ergebnis („X automatisch gebucht")
   ist der Magic Moment aus dem Onboarding — hier mit echten Zahlen.
   Look: Bento 2.0 (docs/DESIGN-BENTO.md) — Dropzone-Kachel + Mini-Kacheln. */

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
    <main
      className="mx-auto max-w-3xl space-y-5 px-6 py-7"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Bank-Import
        </h1>
        <p className="mt-1 text-[14px] text-ink-soft">
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
        className="tile block w-full p-3 text-left transition"
      >
        <span
          className={
            "block rounded-[20px] border-2 border-dashed px-8 py-14 text-center transition " +
            (ziehen
              ? "border-brand-600 bg-brand-50"
              : "border-sand-300 hover:border-brand-400 hover:bg-brand-50/40")
          }
        >
          <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-700">
            ⇣
          </span>
          <span className="mt-3 block text-[15px] font-semibold text-ink">
            {laedt ? "Verarbeite …" : "CSV hierher ziehen oder klicken"}
          </span>
          <span className="mt-1 block text-[13px] text-ink-soft">
            Kontoumsätze als CSV, max. 10 MB
          </span>
        </span>
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
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">
          {fehler}
        </p>
      )}

      {ergebnis && (
        <section className="rise space-y-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-status-good-bg text-status-good">✓</span>
            Import fertig — der Autopilot hat direkt mitgearbeitet.
          </p>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { wert: ergebnis.neu, label: "Umsätze neu",
                kachel: "tile", dt: "text-ink-soft", dd: "text-ink" },
              { wert: ergebnis.uebersprungen, label: "schon bekannt",
                kachel: "tile", dt: "text-ink-soft", dd: "text-ink" },
              { wert: ergebnis.auto_gebucht, label: "automatisch gebucht",
                kachel: "tile tile-mint", dt: "text-tile-mint-ink", dd: "text-tile-mint-deep" },
              { wert: ergebnis.vorgeschlagen - ergebnis.auto_gebucht, label: "zur Prüfung",
                kachel: "tile tile-apricot", dt: "text-tile-apricot-ink", dd: "text-tile-apricot-ink" },
            ].map((k) => (
              <div key={k.label} className={k.kachel + " p-5"}>
                <dt className={"text-[11px] font-semibold uppercase tracking-wider " + k.dt}>
                  {k.label}
                </dt>
                <dd className={"zahl-hero mt-2 text-3xl " + k.dd}>
                  {k.wert}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/app/pruefliste/"
              className="knopf knopf-primaer px-6 py-2.5 text-[13.5px]"
            >
              Zur Prüfliste
            </Link>
            <Link
              href="/app/"
              className="knopf knopf-kontur px-5 py-2.5 text-[13.5px]"
            >
              Zur Übersicht
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
