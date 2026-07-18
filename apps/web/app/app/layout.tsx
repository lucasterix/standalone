"use client";

/* Echte App-Shell (/app): Login-Guard, Identität aus /auth/ich,
   Sidebar mit echten Routen. Statisch exportiert — alles client-seitig. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getOrgId, istAngemeldet, setOrgId, type Ich } from "@/lib/client";
import { BRAND } from "@/lib/brand";

const NAV = [
  { href: "/app", label: "Übersicht", icon: "◧" },
  { href: "/app/pruefliste", label: "Prüfliste", icon: "☑" },
  { href: "/app/import", label: "Bank-Import", icon: "⇣" },
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
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition " +
                  (aktiv
                    ? "bg-brand-50 text-brand-800"
                    : "text-sand-600 hover:bg-sand-100 hover:text-sand-900")
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
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition " +
                (pathname.startsWith("/app/kanzlei")
                  ? "bg-brand-50 text-brand-800"
                  : "text-sand-600 hover:bg-sand-100 hover:text-sand-900")
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
          className="rounded-xl border border-sand-200 px-3 py-2 text-[13px] font-semibold text-sand-600 transition hover:border-sand-300 hover:text-sand-900"
        >
          Abmelden
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sand-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <p className="truncate font-semibold text-sand-900">
            {org?.name ?? "…"}
          </p>
          {ich && (
            <span className="text-[13px] text-sand-600">{ich.name}</span>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
