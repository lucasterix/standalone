import Link from "next/link";
import { BRAND } from "@/lib/brand";

/* App-Shell des Produkt-Prototyps: ruhige Sidebar, viel Fläche für Inhalt.
   Alles statisch mit Beispieldaten — Design-Zielbild, kein Backend. */

const NAV = [
  { href: "/demo", label: "Übersicht", icon: "◧", aktiv: true },
  { href: "/demo", label: "Prüfliste", icon: "☑", badge: "6" },
  { href: "/demo", label: "Belege", icon: "⎘" },
  { href: "/demo", label: "Offene Posten", icon: "⇄" },
  { href: "/demo", label: "DATEV", icon: "⇪" },
  { href: "/demo", label: "Einstellungen", icon: "⚙" },
];

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-sand-100/50">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sand-200 bg-white px-4 py-5 md:flex">
        <Link href="/" className="flex items-baseline gap-1.5 px-2">
          <span
            aria-hidden
            className="relative top-[1px] inline-block h-3.5 w-3.5 rounded-[5px] bg-brand-600"
          >
            <span className="absolute inset-[3.5px] rounded-full bg-white" />
          </span>
          <span className="font-display text-lg font-semibold text-sand-900">
            {BRAND.name}
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition " +
                (n.aktiv
                  ? "bg-brand-50 text-brand-800"
                  : "text-sand-600 hover:bg-sand-100 hover:text-sand-900")
              }
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="w-4 text-center text-[15px]">
                  {n.icon}
                </span>
                {n.label}
              </span>
              {n.badge && (
                <span className="tnum rounded-full bg-amber-acc/10 px-2 py-0.5 text-[11px] font-bold text-amber-acc">
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-3.5 py-3 text-[12px] leading-relaxed text-brand-900">
          <p className="font-bold">Demo-Modus</p>
          <p className="mt-0.5 text-brand-800/80">
            Prototyp mit Beispieldaten eines fiktiven Pflegedienstes.
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sand-200 bg-white/85 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <p className="font-semibold text-sand-900">
              Pflegedienst Sonnenweg GmbH
            </p>
            <span className="rounded-lg border border-sand-200 bg-sand-50 px-2.5 py-1 text-[12px] font-semibold text-sand-600">
              WJ 2026
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-status-good-bg px-3 py-1.5 text-[12px] font-semibold text-status-good sm:inline-flex">
              <span aria-hidden>●</span> Autopilot aktiv
            </span>
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
            >
              SW
            </span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
