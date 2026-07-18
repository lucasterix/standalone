"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setSession } from "@/lib/client";
import { BRAND } from "@/lib/brand";

type LoginAntwort = {
  user_id: number;
  name: string;
  orgs: { org_id: number; rolle: string; name: string; art: string }[];
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function anmelden(e?: React.FormEvent, mail?: string, pw?: string) {
    e?.preventDefault();
    setFehler(null);
    setLaedt(true);
    try {
      const r = await api.post<LoginAntwort>("/auth/login", {
        email: mail ?? email,
        passwort: pw ?? passwort,
      });
      const erste = r.orgs[0];
      setSession(erste ? erste.org_id : null);
      router.push(erste?.art === "kanzlei" ? "/app/kanzlei/" : "/app/");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-100/60 px-5">
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
          onSubmit={anmelden}
          className="rise rounded-3xl border border-sand-200 bg-white p-8 shadow-[0_24px_60px_-30px_rgba(19,78,74,0.25)]"
        >
          <h1 className="font-display text-xl font-semibold text-sand-900">
            Anmelden
          </h1>
          <label className="mt-5 block">
            <span className="text-[13px] font-semibold text-sand-700">
              E-Mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-xl border border-sand-300 px-4 py-3 text-[15px] focus:border-brand-600 focus:outline-none"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] font-semibold text-sand-700">
              Passwort
            </span>
            <input
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-xl border border-sand-300 px-4 py-3 text-[15px] focus:border-brand-600 focus:outline-none"
            />
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
            {laedt ? "Melde an …" : "Anmelden"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13.5px] text-sand-600">
          Noch kein Konto?{" "}
          <Link href="/registrieren/" className="font-semibold text-brand-700 underline">
            Kostenlos starten
          </Link>
        </p>

        {/* Demo-Zugänge (Seed) — bewusst sichtbar für Pilot-Interessenten. */}
        <div className="mt-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-5 py-4 text-[13px] text-brand-900">
          <p className="font-bold">Demo ausprobieren:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                anmelden(undefined, "inhaberin@sonnenweg.example", "sonnenweg-demo-2026")
              }
              className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 font-semibold transition hover:border-brand-600"
            >
              Als Pflegedienst
            </button>
            <button
              type="button"
              onClick={() =>
                anmelden(undefined, "kanzlei@meyer-kollegen.example", "kanzlei-demo-2026")
              }
              className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 font-semibold transition hover:border-brand-600"
            >
              Als Steuerkanzlei
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
