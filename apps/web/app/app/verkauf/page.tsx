"use client";

/* Verkauf — Angebote + Rechnungen (E-Rechnung als XRechnung-XML).
   Eine Rechnung erzeugt automatisch einen offenen Posten: geht die
   Zahlung auf der Bank ein, bucht der Autopilot sie dagegen. */

import { useCallback, useEffect, useState } from "react";
import { api, downloadDatei, euro, getOrgId } from "@/lib/client";

type Position = {
  bezeichnung: string; menge: number; einzelpreis: number; ust_satz: number;
};

type Dokument = {
  id: number; art: string; nummer: string; status: string;
  kunde_name: string; kunde_email: string | null; leitweg_id: string | null;
  datum: string; faellig_am: string | null;
  positionen: Position[];
  summe_netto: string; summe_ust: string; summe_brutto: string;
};

const LEER: Position = { bezeichnung: "", menge: 1, einzelpreis: 0, ust_satz: 0 };

const STATUS_CHIP: Record<string, string> = {
  entwurf: "bg-sand-100 text-sand-700",
  versendet: "bg-tile-lavender text-tile-lavender-ink",
  angenommen: "chip-mint",
  abgelehnt: "bg-status-crit-bg text-status-crit",
  offen: "chip-apricot",
  bezahlt: "chip-mint",
  storniert: "bg-sand-100 text-sand-500 line-through",
};

export default function Verkauf() {
  const [docs, setDocs] = useState<Dokument[] | null>(null);
  const [neuArt, setNeuArt] = useState<string | null>(null);
  const [kunde, setKunde] = useState("");
  const [email, setEmail] = useState("");
  const [leitweg, setLeitweg] = useState("");
  const [positionen, setPositionen] = useState<Position[]>([{ ...LEER }]);
  const [ausAngebot, setAusAngebot] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sende, setSende] = useState(false);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Dokument[]>(`/orgs/${org}/verkauf`)
      .then(setDocs)
      .catch((e) => setFehler(e.message));
  }, []);
  useEffect(laden, [laden]);

  function meldung(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 3200);
  }

  function rechnungAusAngebot(d: Dokument) {
    setNeuArt("rechnung");
    setKunde(d.kunde_name);
    setEmail(d.kunde_email ?? "");
    setLeitweg(d.leitweg_id ?? "");
    setPositionen(d.positionen.map((p) => ({ ...p })));
    setAusAngebot(d.id);
  }

  async function anlegen() {
    const org = getOrgId();
    if (!org || !neuArt) return;
    setSende(true);
    setFehler(null);
    try {
      const dok = await api.post<Dokument>(`/orgs/${org}/verkauf`, {
        art: neuArt,
        kunde_name: kunde,
        kunde_email: email || null,
        leitweg_id: leitweg || null,
        positionen: positionen.filter((p) => p.bezeichnung.trim()),
        angebot_id: ausAngebot,
      });
      meldung(`${dok.nummer} erstellt (${euro(dok.summe_brutto)}).`);
      setNeuArt(null);
      setKunde(""); setEmail(""); setLeitweg("");
      setPositionen([{ ...LEER }]);
      setAusAngebot(null);
      laden();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSende(false);
    }
  }

  async function statusSetzen(d: Dokument, status: string) {
    const org = getOrgId();
    if (!org) return;
    await api.patch(`/orgs/${org}/verkauf/${d.id}/status`, { status });
    meldung(`${d.nummer} → ${status}.`);
    laden();
  }

  const netto = positionen.reduce((s, p) => s + p.menge * p.einzelpreis, 0);
  const ust = positionen.reduce((s, p) => s + p.menge * p.einzelpreis * p.ust_satz / 100, 0);

  const angebote = (docs ?? []).filter((d) => d.art === "angebot");
  const rechnungen = (docs ?? []).filter((d) => d.art === "rechnung");

  const FELD = "rounded-2xl border border-sand-300 bg-white px-3.5 py-2.5 text-[13.5px] focus:border-brand-600 focus:outline-none";

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Verkauf</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Angebote und Rechnungen — jede Rechnung wird ein offener Posten,
            den der Autopilot beim Zahlungseingang selbst abhakt.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setNeuArt("angebot"); setAusAngebot(null); }}
            className="knopf knopf-kontur px-5 py-2.5 text-[13.5px]">
            Neues Angebot
          </button>
          <button type="button" onClick={() => { setNeuArt("rechnung"); setAusAngebot(null); }}
            className="knopf knopf-primaer px-5 py-2.5 text-[13.5px]">
            Neue Rechnung
          </button>
        </div>
      </div>

      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {/* Formular */}
      {neuArt && (
        <section className="tile rise p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            {neuArt === "angebot" ? "Neues Angebot" : "Neue Rechnung"}
            {ausAngebot && <span className="ml-2 text-[13px] font-normal text-ink-soft">aus Angebot</span>}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input value={kunde} onChange={(e) => setKunde(e.target.value)}
              placeholder="Kunde / Kostenträger *" className={FELD} />
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail (optional)" className={FELD} />
            {neuArt === "rechnung" && (
              <input value={leitweg} onChange={(e) => setLeitweg(e.target.value)}
                placeholder="Leitweg-ID (nur Behörden)" className={FELD} />
            )}
          </div>

          <div className="mt-4 space-y-2">
            {positionen.map((p, i) => (
              <div key={i} className="zeile-soft grid grid-cols-[1fr_84px_120px_110px_36px] items-center gap-2 p-2">
                <input value={p.bezeichnung} placeholder="Leistung / Artikel"
                  onChange={(e) => setPositionen(positionen.map((x, j) => j === i ? { ...x, bezeichnung: e.target.value } : x))}
                  className={FELD} />
                <input type="number" min="0" step="0.5" value={p.menge} title="Menge"
                  onChange={(e) => setPositionen(positionen.map((x, j) => j === i ? { ...x, menge: Number(e.target.value) } : x))}
                  className={FELD + " tnum"} />
                <input type="number" min="0" step="0.01" value={p.einzelpreis} title="Einzelpreis €"
                  onChange={(e) => setPositionen(positionen.map((x, j) => j === i ? { ...x, einzelpreis: Number(e.target.value) } : x))}
                  className={FELD + " tnum"} />
                <select value={p.ust_satz} title="USt-Satz"
                  onChange={(e) => setPositionen(positionen.map((x, j) => j === i ? { ...x, ust_satz: Number(e.target.value) } : x))}
                  className={FELD + " tnum"}>
                  <option value={0}>0 % (§ 4 Nr. 16)</option>
                  <option value={7}>7 %</option>
                  <option value={19}>19 %</option>
                </select>
                <button type="button" aria-label="Position entfernen"
                  onClick={() => setPositionen(positionen.filter((_, j) => j !== i))}
                  className="text-[16px] text-sand-400 hover:text-status-crit">×</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => setPositionen([...positionen, { ...LEER }])}
              className="text-[13px] font-semibold text-brand-700 underline-offset-2 hover:underline">
              + Position
            </button>
            <p className="tnum text-[13.5px] text-ink-soft">
              Netto {euro(netto)} · USt {euro(ust)} ·{" "}
              <strong className="text-ink">Gesamt {euro(netto + ust)}</strong>
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setNeuArt(null)}
              className="knopf knopf-kontur px-5 py-2.5 text-[13.5px]">Abbrechen</button>
            <button type="button" disabled={sende || !kunde.trim() || !positionen.some((p) => p.bezeichnung.trim())}
              onClick={anlegen}
              className="knopf knopf-primaer px-6 py-2.5 text-[13.5px] disabled:opacity-40">
              {sende ? "Erstelle …" : neuArt === "angebot" ? "Angebot erstellen" : "Rechnung stellen"}
            </button>
          </div>
        </section>
      )}

      {/* Rechnungen */}
      <section className="tile p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Rechnungen</h2>
        {rechnungen.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">
            Noch keine — die erste Rechnung legt automatisch einen offenen Posten an.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rechnungen.map((d) => (
              <div key={d.id} className="zeile-soft flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="tnum w-28 text-[13px] font-bold text-ink">{d.nummer}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{d.kunde_name}</span>
                <span className={`chip ${STATUS_CHIP[d.status] ?? ""}`}>{d.status}</span>
                <span className="tnum w-28 text-right text-[13.5px] font-bold">{euro(d.summe_brutto)}</span>
                <div className="flex gap-1.5">
                  <button type="button"
                    onClick={() => downloadDatei(`/orgs/${getOrgId()}/verkauf/${d.id}/xrechnung`, `${d.nummer}_xrechnung.xml`)}
                    className="knopf knopf-kontur px-3 py-1.5 text-[12px]">
                    E-Rechnung (XML)
                  </button>
                  {d.status === "offen" && (
                    <button type="button" onClick={() => statusSetzen(d, "bezahlt")}
                      className="knopf knopf-primaer px-3 py-1.5 text-[12px]">
                      Bezahlt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Angebote */}
      <section className="tile tile-lavender p-6">
        <h2 className="font-display text-lg font-semibold text-tile-lavender-ink">Angebote</h2>
        {angebote.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">Noch keine Angebote.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {angebote.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <span className="tnum w-28 text-[13px] font-bold text-ink">{d.nummer}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{d.kunde_name}</span>
                <span className={`chip ${STATUS_CHIP[d.status] ?? ""}`}>{d.status}</span>
                <span className="tnum w-28 text-right text-[13.5px] font-bold">{euro(d.summe_brutto)}</span>
                <div className="flex gap-1.5">
                  {d.status === "entwurf" && (
                    <button type="button" onClick={() => statusSetzen(d, "versendet")}
                      className="knopf knopf-kontur px-3 py-1.5 text-[12px]">Versendet</button>
                  )}
                  {d.status !== "angenommen" && d.status !== "abgelehnt" && (
                    <button type="button" onClick={() => rechnungAusAngebot(d)}
                      className="knopf knopf-primaer px-3 py-1.5 text-[12px]">
                      Rechnung daraus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-brand-200 bg-white px-5 py-3 shadow-xl">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <span className="text-status-good" aria-hidden>✓</span>{toast}
          </p>
        </div>
      )}
    </main>
  );
}
