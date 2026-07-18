"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Sidebar-Navigation mit echtem Aktiv-Status je Route. */

const NAV = [
  { href: "/demo", label: "Übersicht", icon: "◧" },
  { href: "/demo/pruefliste", label: "Prüfliste", icon: "☑", badge: "6" },
  { href: "/demo/belege", label: "Belege", icon: "⎘", badge: "2" },
  { href: "/demo/posten", label: "Offene Posten", icon: "⇄" },
  { href: "/demo/datev", label: "DATEV", icon: "⇪" },
  { href: "/demo/einstellungen", label: "Einstellungen", icon: "⚙" },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {NAV.map((n) => {
        const aktiv =
          n.href === "/demo" ? pathname === "/demo" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={aktiv ? "page" : undefined}
            className={
              "flex items-center justify-between rounded-full px-4 py-2.5 text-[14px] font-medium transition " +
              (aktiv
                ? "bg-brand-700 font-semibold text-white shadow-sm"
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
              <span className="tnum rounded-full bg-tile-apricot px-2 py-0.5 text-[11px] font-bold text-tile-apricot-ink">
                {n.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
