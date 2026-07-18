"use client";

/* Registrierung — legt User + Unternehmen (mit Kontenrahmen + Bankkonto) an
   und meldet direkt an. Danach führt /app/import zum ersten Magic Moment. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setSession } from "@/lib/client";
import { BRAND } from "@/lib/brand";

type Antwort = { user_id: number; org_id: number | null };

const FELD =
  "mt-1.5 w-full rounded-xl border border-sand-300 px-4 py-3 text-[15px] focus:border-brand-600 focus:outline-none";

export default function Registrieren() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [chart, setChart] = useState("skr45");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLaedt(true);
    try {
      const r = await api.post<Antwort>("/auth/registrieren", {
        email,
        name,
        passwort,
        org_name: firma,
        org_chart: chart,
      });
      setSession(r.org_id);
      router.push("/app/import/");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-100/60 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/" className="inline-flex items-baseline gap-1.5">
            <span
              aria-hidden
              className="relative top-[1px] inline-block h-3.5 w-3.5 rounded-[5px] bg-brand-600"
            >
              <span className="absolute inset-[3.5px] rounded-full bg-sand-100" />
            </span>
            <span className="font-display text-2xl font-semibold text-sand-900">
              {BRAND.name}
            </span>
          </Link>
        </div>
        <form
          onSubmit={absenden}
          className="rise rounded-3xl border border-sand-200 bg-white p-8 shadow-[0_24px_60px_-30px_rgba(19,78,74,0.25)]"
        >
          <h1 className="font-display text-xl font-semibold text-sand-900">
            Kostenlos starten
          </h1>
          <p className="mt-1 text-[13.5px] text-sand-600">
            Konto + Unternehmen anlegen — danach direkt den ersten
            Kontoauszug hochladen.
          </p>

          <label className="mt-5 block">
            <span className="text-[13px] font-semibold text-sand-700">Ihr Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              autoComplete="name" required className={FELD} />
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-sand-700">Unternehmen</span>
            <input value={firma} onChange={(e) => setFirma(e.target.value)}
              placeholder="z. B. Pflegedienst Müller GmbH" required className={FELD} />
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-sand-700">Kontenrahmen</span>
            <select value={chart} onChange={(e) => setChart(e.target.value)} className={FELD}>
              <option value="skr45">SKR45 — Pflege &amp; Sozialwirtschaft</option>
              <option value="skr04">SKR04 — Standard (GmbH / GuV)</option>
            </select>
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-sand-700">E-Mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required className={FELD} />
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-sand-700">
              Passwort <span className="font-normal text-sand-500">(mind. 10 Zeichen)</span>
            </span>
            <input type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)}
              autoComplete="new-password" minLength={10} required className={FELD} />
          </label>

          {fehler && (
            <p className="mt-3 rounded-xl bg-status-crit-bg px-3.5 py-2.5 text-[13px] font-medium text-status-crit">
              {fehler}
            </p>
          )}
          <button
            type="submit"
            disabled={laedt}
            className="mt-6 w-full rounded-2xl bg-brand-700 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-800 disabled:opacity-50"
          >
            {laedt ? "Lege an …" : "Konto anlegen"}
          </button>
        </form>
        <p className="mt-4 text-center text-[13.5px] text-sand-600">
          Schon ein Konto?{" "}
          <Link href="/login/" className="font-semibold text-brand-700 underline">
            Anmelden
          </Link>
        </p>
      </div>
    </main>
  );
}
