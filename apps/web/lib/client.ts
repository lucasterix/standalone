/* API-Client der echten App (/app): same-origin unter /api (Caddy routet).
   Auth läuft über ein httpOnly-Cookie (kk_session), das der Server beim Login
   setzt — JS sieht das Token nie. Im localStorage liegt nur noch die gewählte
   Org + ein „angemeldet"-Marker für den Guard (der Server bleibt die Wahrheit:
   401 → Login). */

const BASE = "/api";

const ANGEMELDET_KEY = "kk_angemeldet";
const ORG_KEY = "kk_org";

export function istAngemeldet(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ANGEMELDET_KEY) === "1";
}

export function setSession(orgId: number | null) {
  window.localStorage.setItem(ANGEMELDET_KEY, "1");
  if (orgId != null) window.localStorage.setItem(ORG_KEY, String(orgId));
}

export function clearSession() {
  window.localStorage.removeItem(ANGEMELDET_KEY);
  window.localStorage.removeItem(ORG_KEY);
}

export function getOrgId(): number | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(ORG_KEY);
  return v ? Number(v) : null;
}

export function setOrgId(orgId: number) {
  window.localStorage.setItem(ORG_KEY, String(orgId));
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, pfad: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${pfad}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* Text/leer */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, body?: unknown) => request<T>("POST", p, body),
  patch: <T>(p: string, body?: unknown) => request<T>("PATCH", p, body),
};

/* Datei-Upload (CSV-Import): multipart, Cookie-Auth. */
export async function uploadDatei<T>(pfad: string, datei: File): Promise<T> {
  const form = new FormData();
  form.append("datei", datei);
  const res = await fetch(`${BASE}${pfad}`, {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch { /* leer */ }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/* Datei-Download (EXTF): fetch → Blob → Klick. */
export async function downloadDatei(pfad: string, dateiname: string) {
  const res = await fetch(`${BASE}${pfad}`, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, `Download fehlgeschlagen (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

/* Typen der wichtigsten Antworten. */
export type Ich = {
  user_id: number;
  email: string;
  name: string;
  orgs: { org_id: number; rolle: string; name: string; art: string }[];
};

export type JournalZeile = {
  id: number;
  datum: string;
  betrag: string;
  richtung?: string;
  soll: string;
  haben: string;
  bu: number | null;
  text: string;
  partner: string | null;
  partner_nr: string | null;
  status: string;
  origin: string;
  confidence: string;
  begruendung: string | null;
  entschieden_via: string | null;
};

export type SaldoMonat = {
  monat: number;
  tx_count: number;
  tx_summe: string;
  erfasst_count: number;
  erfasst_summe: string;
  offen_count: number;
  diff_count: number;
  diff_summe: string;
  ok: boolean;
  datev_bereit: boolean;
};

export type Saldo = {
  jahr: number;
  ok: boolean;
  doppelt_count: number;
  monate: SaldoMonat[];
};

export type Stapel = {
  id: number;
  von: string;
  bis: string;
  status: string;
  saetze: number;
};

export type CockpitZeile = {
  org_id: number;
  name: string;
  anker_ok: boolean | null;
  anker_monat: number | null;
  offen: number;
  stapel_status: string | null;
  stapel_saetze: number;
  rueckfragen_offen: number;
};

export type ImportErgebnis = {
  neu: number;
  uebersprungen: number;
  vorgeschlagen: number;
  auto_gebucht: number;
};

/* Deutsche Formate — EINE Wahrheit für alle Seiten (Bento-Spec §2). */
export function euro(betrag: string | number): string {
  const n = typeof betrag === "number" ? betrag : Number(betrag);
  if (!Number.isFinite(n)) return String(betrag);
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + " €";
}

export function datumKurz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : iso;
}
