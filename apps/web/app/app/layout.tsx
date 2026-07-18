"use client";

/* Echte App-Shell (/app): Login-Guard, Identität aus /auth/ich,
   Sidebar mit echten Routen. Statisch exportiert — alles client-seitig.
   Look: Bento 2.0 (docs/DESIGN-BENTO.md) — schwebende Sidebar-Kachel,
   leichter Header mit Firmen-Pill + Initialen-Kreis. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getOrgId, istAngemeldet, setOrgId, type Ich } from "@/lib/client";
import { BRAND } from "@/lib/brand";
import SeitenIntro from "@/components/seiten-intro";
import Assistent from "@/components/assistent";
import { LogoMark } from "@/components/logo";

const NAV = [
  { href: "/app", label: "Übersicht", icon: "◧" },
  { href: "/app/pruefliste", label: "Prüfliste", icon: "☑" },
  { href: "/app/import", label: "Bank-Import", icon: "⇣" },
  { href: "/app/buchungen", label: "Buchungen", icon: "≣" },
  { href: "/app/verkauf", label: "Verkauf", icon: "▤" },
  { href: "/app/personal", label: "Personal", icon: "⚉" },
  { href: "/app/datev", label: "DATEV", icon: "⇪" },
  { href: "/app/einstellungen", label: "Einstellungen", icon: "⚙" },
];

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [ich, setIch] = useState<Ich | null>(null);

  useEffect(() => {
    if (!istAngemeldet()) {
      router.replace("/login/");
      return;
    }
    api
      .get<Ich>("/auth/ich")
      .then((d) => {
        setIch(d);
        if (!getOrgId() && d.orgs[0]) setOrgId(d.orgs[0].org_id);
      })
      .catch(() => {
        clearSession();
        router.replace("/login/");
      });
  }, [router]);

  const org = ich?.orgs.find((o) => o.org_id === getOrgId()) ?? ich?.orgs[0];
  const istKanzlei = ich?.orgs.some((o) => o.art === "kanzlei");
  const initialen = ich
    ? ich.name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  async function abmelden() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* Sitzung war ggf. schon weg */
    }
    clearSession();
    router.replace("/login/");
  }

  return (
    <div
      className="flex min-h-screen bg-bento-bg"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      <aside className="tile sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col px-4 py-5 md:flex">
        <Link href="/" className="flex items-baseline gap-1.5 px-2">
          <LogoMark className="h-3.5 w-3.5" />
          <span className="font-display text-lg font-semibold text-ink">
            {BRAND.name}
          </span>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const aktiv =
              n.href === "/app"
                ? pathname === "/app" || pathname === "/app/"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] transition " +
                  (aktiv
                    ? "bg-brand-50 font-semibold text-brand-800"
                    : "font-medium text-ink-soft hover:bg-[#f7f5f1] hover:text-ink")
                }
              >
                <span aria-hidden className="w-4 text-center text-[15px]">
                  {n.icon}
                </span>
                {n.label}
              </Link>
            );
          })}
          {istKanzlei && (
            <Link
              href="/app/kanzlei"
              className={
                "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] transition " +
                (pathname.startsWith("/app/kanzlei")
                  ? "bg-brand-50 font-semibold text-brand-800"
                  : "font-medium text-ink-soft hover:bg-[#f7f5f1] hover:text-ink")
              }
            >
              <span aria-hidden className="w-4 text-center text-[15px]">
                ⌂
              </span>
              Kanzlei-Cockpit
            </Link>
          )}
        </nav>
        <button
          type="button"
          onClick={abmelden}
          className="knopf knopf-kontur px-4 py-2 text-[13px]"
        >
          Abmelden
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-bento-bg/80 px-4 backdrop-blur sm:px-6">
          <p className="truncate rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-sm">
            {org?.name ?? "…"}
          </p>
          <div className="flex items-center gap-2.5">
            <SeitenIntro pfad={pathname} />
            {ich && (
            <span
              title={ich.name}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[13px] font-bold text-white"
            >
              <span aria-hidden>{initialen}</span>
              <span className="sr-only">{ich.name}</span>
            </span>
          )}
          </div>
        </header>
        {children}
        <Assistent />
      </div>
    </div>
  );
}
