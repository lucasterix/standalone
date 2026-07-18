"use client";

/* Öffentliches Personal-Formular — WHITELABEL: Hier tritt ausschließlich
   der Betrieb auf (Firmenname aus dem Link-Token), bewusst neutrales
   Design ohne Kontoklar-Marke, -Farben oder -Logo. Statisch exportiert,
   Token kommt als ?t=… (kein dynamisches Routing nötig). */

import { useEffect, useState } from "react";

type Formular = { firma: string; variante: string; status: string; felder: string[] };

const LABELS: Record<string, { label: string; typ?: string; optionen?: string[] }> = {
  vorname: { label: "Vorname *" },
  nachname: { label: "Nachname *" },
  geburtsdatum: { label: "Geburtsdatum", typ: "date" },
  strasse: { label: "Straße und Hausnummer" },
  plz: { label: "PLZ" },
  ort: { label: "Ort" },
  telefon: { label: "Telefon", typ: "tel" },
  email: { label: "E-Mail", typ: "email" },
  eintrittsdatum: { label: "Eintrittsdatum", typ: "date" },
  iban: { label: "IBAN (für die Gehaltszahlung)" },
  steuer_id: { label: "Steuer-Identifikationsnummer" },
  krankenkasse: { label: "Krankenkasse" },
  sv_nummer: { label: "Sozialversicherungsnummer" },
  geburtsname: { label: "Geburtsname (falls abweichend)" },
  geburtsort: { label: "Geburtsort" },
  staatsangehoerigkeit: { label: "Staatsangehörigkeit" },
  familienstand: { label: "Familienstand", optionen: ["ledig", "verheiratet", "geschieden", "verwitwet", "eingetragene Lebenspartnerschaft"] },
  kinder_anzahl: { label: "Anzahl Kinder" },
  kinderfreibetraege: { label: "Kinderfreibeträge" },
  konfession: { label: "Konfession (für die Kirchensteuer)" },
  hoechster_schulabschluss: { label: "Höchster Schulabschluss" },
  berufsausbildung: { label: "Berufsausbildung / Studium" },
  schwerbehinderung: { label: "Schwerbehinderung", optionen: ["nein", "ja", "gleichgestellt"] },
  weitere_beschaeftigung: { label: "Weitere Beschäftigung?", optionen: ["nein", "ja"] },
  minijob: { label: "Ist dies ein Minijob?", optionen: ["nein", "ja"] },
  rentenversicherung_befreiung: { label: "Befreiung von der Rentenversicherung (nur Minijob)", optionen: ["nein", "ja"] },
  fuehrerschein: { label: "Führerschein-Klasse(n)" },
  qualifikation: { label: "Qualifikation (z. B. Pflegefachkraft, Betreuungskraft § 43b)" },
  notfall_name: { label: "Notfallkontakt — Name" },
  notfall_telefon: { label: "Notfallkontakt — Telefon", typ: "tel" },
};

const ABSCHNITTE: { titel: string; felder: string[] }[] = [
  { titel: "Persönliche Angaben", felder: ["vorname", "nachname", "geburtsdatum", "geburtsname", "geburtsort", "staatsangehoerigkeit", "familienstand"] },
  { titel: "Kontakt & Adresse", felder: ["strasse", "plz", "ort", "telefon", "email", "notfall_name", "notfall_telefon"] },
  { titel: "Beschäftigung", felder: ["eintrittsdatum", "qualifikation", "berufsausbildung", "hoechster_schulabschluss", "fuehrerschein", "weitere_beschaeftigung", "minijob", "rentenversicherung_befreiung", "schwerbehinderung"] },
  { titel: "Lohn & Sozialversicherung", felder: ["iban", "steuer_id", "krankenkasse", "sv_nummer", "konfession", "kinder_anzahl", "kinderfreibetraege"] },
];

export default function OeffentlichesFormular() {
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<Formular | null>(null);
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const [sende, setSende] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    setToken(t);
    if (!t) {
      setFehler("Dieser Link ist unvollständig.");
      return;
    }
    fetch(`/api/personal/formular/${t}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail ?? "Link ungültig");
        return r.json();
      })
      .then((f: Formular) => {
        if (f.status === "ausgefuellt") setFertig(true);
        setForm(f);
      })
      .catch((e) => setFehler(e.message));
  }, []);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSende(true);
    setFehler(null);
    try {
      const r = await fetch(`/api/personal/formular/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daten: werte }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Absenden fehlgeschlagen");
      setFertig(true);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSende(false);
    }
  }

  const feldSet = new Set(form?.felder ?? []);

  return (
    <main className="min-h-screen bg-[#f2f3f5] px-5 py-10 font-sans text-[#1f2428]">
      <div className="mx-auto max-w-xl">
        {fehler && !form ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-[15px] font-semibold">{fehler}</p>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Bitte wenden Sie sich an Ihren Ansprechpartner im Betrieb.
            </p>
          </div>
        ) : !form ? (
          <p className="text-center text-[14px] text-[#6b7280]">Lade …</p>
        ) : fertig ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f3ec] text-2xl text-[#1e7a46]">✓</span>
            <h1 className="mt-4 text-xl font-bold">Vielen Dank!</h1>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-[#6b7280]">
              Ihre Angaben sind sicher bei <strong>{form.firma}</strong>{" "}
              angekommen. Sie können dieses Fenster jetzt schließen.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-bold">{form.firma}</h1>
              <p className="mt-1.5 text-[14px] text-[#6b7280]">
                Willkommen im Team! Bitte füllen Sie diesen Personalbogen aus —
                dauert nur ein paar Minuten.
              </p>
            </header>

            <form onSubmit={absenden} className="space-y-4">
              {ABSCHNITTE.map((a) => {
                const sichtbar = a.felder.filter((f) => feldSet.has(f));
                if (sichtbar.length === 0) return null;
                return (
                  <section key={a.titel} className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6b7280]">
                      {a.titel}
                    </h2>
                    <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                      {sichtbar.map((f) => {
                        const def = LABELS[f] ?? { label: f };
                        const breit = ["strasse", "iban", "qualifikation", "berufsausbildung"].includes(f);
                        return (
                          <label key={f} className={breit ? "sm:col-span-2" : ""}>
                            <span className="block text-[12.5px] font-semibold text-[#374151]">
                              {def.label}
                            </span>
                            {def.optionen ? (
                              <select
                                value={werte[f] ?? ""}
                                onChange={(e) => setWerte({ ...werte, [f]: e.target.value })}
                                className="mt-1 w-full rounded-xl border border-[#d3d8de] bg-white px-3.5 py-2.5 text-[14px] focus:border-[#4b5563] focus:outline-none"
                              >
                                <option value="">Bitte wählen …</option>
                                {def.optionen.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type={def.typ ?? "text"}
                                required={f === "vorname" || f === "nachname"}
                                value={werte[f] ?? ""}
                                onChange={(e) => setWerte({ ...werte, [f]: e.target.value })}
                                className="mt-1 w-full rounded-xl border border-[#d3d8de] bg-white px-3.5 py-2.5 text-[14px] focus:border-[#4b5563] focus:outline-none"
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {fehler && (
                <p className="rounded-xl bg-[#fdecec] px-4 py-3 text-[13px] font-medium text-[#b42323]">{fehler}</p>
              )}

              <button
                type="submit"
                disabled={sende}
                className="w-full rounded-2xl bg-[#1f2428] py-3.5 text-[15px] font-bold text-white transition hover:bg-black disabled:opacity-50"
              >
                {sende ? "Sende …" : `Absenden an ${form.firma}`}
              </button>
              <p className="pb-4 text-center text-[11.5px] leading-relaxed text-[#9aa1a9]">
                Ihre Angaben werden verschlüsselt übertragen und ausschließlich
                für Ihr Beschäftigungsverhältnis bei {form.firma} verwendet.
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
