"use client";

/* Personal-Onboarding — Links erstellen (Kurz/Umfangreich), verschicken,
   Rücklauf einsehen. Das Formular hinter dem Link ist Whitelabel:
   Dort erscheint nur der eigene Firmenname. */

import { useCallback, useEffect, useState } from "react";
import { api, getOrgId } from "@/lib/client";

type Einladung = {
  id: number; token: string; variante: string; notiz: string | null;
  status: string; mitarbeiter_name: string | null;
  created_at: string; ausgefuellt_am: string | null;
  daten: Record<string, string> | null;
};

const FELD_LABELS: Record<string, string> = {
  vorname: "Vorname", nachname: "Nachname", geburtsdatum: "Geburtsdatum",
  strasse: "Straße", plz: "PLZ", ort: "Ort", telefon: "Telefon",
  email: "E-Mail", eintrittsdatum: "Eintritt", iban: "IBAN",
  steuer_id: "Steuer-ID", krankenkasse: "Krankenkasse",
  sv_nummer: "SV-Nummer", geburtsname: "Geburtsname", geburtsort: "Geburtsort",
  staatsangehoerigkeit: "Staatsangehörigkeit", familienstand: "Familienstand",
  kinder_anzahl: "Kinder", kinderfreibetraege: "Kinderfreibeträge",
  konfession: "Konfession", hoechster_schulabschluss: "Schulabschluss",
  berufsausbildung: "Ausbildung", schwerbehinderung: "Schwerbehinderung",
  weitere_beschaeftigung: "Weitere Beschäftigung", minijob: "Minijob",
  rentenversicherung_befreiung: "RV-Befreiung", fuehrerschein: "Führerschein",
  qualifikation: "Qualifikation", notfall_name: "Notfallkontakt",
  notfall_telefon: "Notfall-Telefon",
};

export default function Personal() {
  const [liste, setListe] = useState<Einladung[] | null>(null);
  const [notiz, setNotiz] = useState("");
  const [offenId, setOffenId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(() => {
    const org = getOrgId();
    if (!org) return;
    api.get<Einladung[]>(`/orgs/${org}/personal/einladungen`)
      .then(setListe)
      .catch((e) => setFehler(e.message));
  }, []);
  useEffect(laden, [laden]);

  function linkVon(e: Einladung) {
    return `${window.location.origin}/f/?t=${e.token}`;
  }

  async function kopieren(text: string, meldung: string) {
    await navigator.clipboard.writeText(text);
    setToast(meldung);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function erstellen(variante: string) {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    try {
      const e = await api.post<Einladung>(`/orgs/${org}/personal/einladungen`, {
        variante, notiz: notiz.trim() || null,
      });
      setNotiz("");
      laden();
      await kopieren(
        `${window.location.origin}/f/?t=${e.token}`,
        "Link erstellt und in die Zwischenablage kopiert.",
      );
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Fehler");
    }
  }

  async function zurueckziehen(e: Einladung) {
    const org = getOrgId();
    if (!org) return;
    await api.post(`/orgs/${org}/personal/einladungen/${e.id}/zurueckziehen`);
    laden();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Personal</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Onboarding-Links für neue Mitarbeitende — das Formular läuft unter
          Ihrem Firmennamen (Whitelabel), Kontoklar taucht dort nicht auf.
        </p>
      </div>

      {fehler && (
        <p className="rounded-2xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {/* Link erstellen */}
      <section className="tile p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Neuen Link erstellen</h2>
        <input
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder="Notiz für Sie, z. B. „Frau Petersen, Tourenpflege“ (optional)"
          className="mt-3 w-full rounded-2xl border border-sand-300 bg-white px-4 py-2.5 text-[13.5px] focus:border-brand-600 focus:outline-none"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => erstellen("kurz")}
            className="rounded-[20px] border-2 border-sand-200 bg-white p-5 text-left transition hover:border-brand-600"
          >
            <p className="text-[15px] font-bold text-ink">Kurzversion</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              13 Felder — das Nötigste für Vertrag und erste Lohnabrechnung
              (Stammdaten, IBAN, Steuer-ID, Krankenkasse, SV-Nummer).
            </p>
            <p className="mt-3 text-[12.5px] font-bold text-brand-700">Link erstellen + kopieren →</p>
          </button>
          <button
            type="button"
            onClick={() => erstellen("lang")}
            className="rounded-[20px] border-2 border-sand-200 bg-white p-5 text-left transition hover:border-brand-600"
          >
            <p className="text-[15px] font-bold text-ink">Umfangreich</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              30 Felder — kompletter Personalfragebogen inkl. Kirchensteuer,
              Kinderfreibeträgen, Qualifikation, Minijob-Status, Notfallkontakt.
            </p>
            <p className="mt-3 text-[12.5px] font-bold text-brand-700">Link erstellen + kopieren →</p>
          </button>
        </div>
      </section>

      {/* Rücklauf */}
      <section className="tile p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Versendete Links</h2>
        {liste == null ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">Lade …</p>
        ) : liste.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">
            Noch keine — erstellen Sie oben den ersten Link und schicken Sie
            ihn per Mail oder Messenger an die neue Kollegin.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {liste.map((e) => (
              <div key={e.id} className="zeile-soft overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={`chip ${
                    e.status === "ausgefuellt" ? "chip-mint"
                      : e.status === "zurueckgezogen" ? "bg-sand-100 text-sand-500 line-through"
                        : "chip-apricot"}`}>
                    {e.status === "ausgefuellt" ? "ausgefüllt"
                      : e.status === "zurueckgezogen" ? "zurückgezogen" : "offen"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                    {e.mitarbeiter_name ?? e.notiz ?? "Ohne Notiz"}
                    <span className="ml-2 text-[11.5px] font-normal text-sand-500">
                      {e.variante === "lang" ? "umfangreich" : "kurz"}
                    </span>
                  </span>
                  <div className="flex gap-1.5">
                    {e.status === "offen" && (
                      <>
                        <button type="button"
                          onClick={() => kopieren(linkVon(e), "Link kopiert.")}
                          className="knopf knopf-kontur px-3 py-1.5 text-[12px]">
                          Link kopieren
                        </button>
                        <button type="button" onClick={() => zurueckziehen(e)}
                          className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-sand-500 hover:text-status-crit">
                          Zurückziehen
                        </button>
                      </>
                    )}
                    {e.status === "ausgefuellt" && (
                      <button type="button"
                        onClick={() => setOffenId(offenId === e.id ? null : e.id)}
                        className="knopf knopf-primaer px-3.5 py-1.5 text-[12px]">
                        {offenId === e.id ? "Zuklappen" : "Daten ansehen"}
                      </button>
                    )}
                  </div>
                </div>
                {offenId === e.id && e.daten && (
                  <dl className="grid gap-x-6 gap-y-2 border-t border-sand-200 bg-white px-5 py-4 sm:grid-cols-2">
                    {Object.entries(e.daten).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <dt className="shrink-0 font-semibold text-sand-500">{FELD_LABELS[k] ?? k}</dt>
                        <dd className="tnum truncate text-right font-semibold text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
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
