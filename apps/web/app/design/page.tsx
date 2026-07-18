/* Design-Auswahl: drei Richtungen fürs komplette Redesign — Daniel wählt. */
import Link from "next/link";

const V = [
  { href: "/design/a/", n: "A — Editorial Ledger", t: "Magazin-Typografie, Hairlines statt Karten, große Serifen-Zahlen. Die eigenständigste, ruhigste Richtung." },
  { href: "/design/b/", n: "B — Cockpit", t: "Dunkles Instrumentenbrett: Quoten-Ring, Verlaufs-Chart, Glas-Karten, leuchtende Status. Modernste SaaS-Anmutung." },
  { href: "/design/c/", n: "C — Bento", t: "Farbige Bento-Kacheln, runde Formen, freundliche Größe. Nahbar wie eine Consumer-App." },
];

export default function DesignIndex() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-sand-900">Design-Varianten</h1>
      <p className="mt-2 text-[15px] text-sand-600">Dieselbe Übersichts-Seite, drei Design-Sprachen — bitte eine wählen.</p>
      <div className="mt-8 space-y-4">
        {V.map((v) => (
          <Link key={v.href} href={v.href} className="block rounded-2xl border border-sand-200 bg-white p-6 shadow-sm transition hover:border-brand-500">
            <p className="font-display text-xl font-semibold text-sand-900">{v.n}</p>
            <p className="mt-1.5 text-[14px] text-sand-600">{v.t}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
