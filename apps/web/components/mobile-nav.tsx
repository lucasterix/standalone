"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* Mobile-Navigation der App (Slide-over) — Desktop nutzt die Sidebar.
   Das Overlay wird per Portal an <body> gerendert: der App-Header nutzt
   backdrop-blur und wäre sonst Containing-Block für position:fixed
   (Overlay bekäme nur Header-Höhe). */

const NAV = [
  { href: "/demo", label: "Übersicht" },
  { href: "/demo/pruefliste", label: "Prüfliste", badge: "6" },
  { href: "/demo/belege", label: "Belege", badge: "2" },
  { href: "/demo/posten", label: "Offene Posten" },
  { href: "/demo/datev", label: "DATEV" },
  { href: "/demo/einstellungen", label: "Einstellungen" },
];

export default function MobileNav() {
  const [offen, setOffen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setOffen(false), [pathname]);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menü öffnen"
        aria-expanded={offen}
        onClick={() => setOffen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-sand-200 text-sand-700"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {offen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setOffen(false)}
            className="absolute inset-0 bg-sand-900/30 backdrop-blur-[2px]"
          />
          <nav className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-sand-900">
                Menü
              </span>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setOffen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sand-500 hover:bg-sand-100"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {NAV.map((n) => {
                const aktiv =
                  n.href === "/demo"
                    ? pathname === "/demo"
                    : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={
                      "flex items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-medium " +
                      (aktiv
                        ? "bg-brand-50 text-brand-800"
                        : "text-sand-700 hover:bg-sand-100")
                    }
                  >
                    {n.label}
                    {n.badge && (
                      <span className="tnum rounded-full bg-amber-acc/10 px-2 py-0.5 text-[11px] font-bold text-amber-acc">
                        {n.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
