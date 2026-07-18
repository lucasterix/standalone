"use client";

/* Onboarding-Wizard nach der Registrierung: 3 Fachfragen statt Formularflut
   (Recherche: Personalisierung schlägt Generik; alles überspringbar, gute
   Defaults). Setzt die Algorithmus-Einstellungen und führt zum Import —
   der Magic Moment bleibt der erste CSV-Upload. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, getOrgId } from "@/lib/client";

const STUFEN = [
  { key: "vorsichtig", name: "Vorsichtig", text: "Nur eindeutige Zahlungen (offene Posten, Kostenträger). Maximale Kontrolle." },
  { key: "ausgewogen", name: "Ausgewogen", empfohlen: true, text: "Plus Ihre Regeln und sicher Gelerntes. Der bewährte Start." },
  { key: "mutig", name: "Mutig", text: "Plus Historie ab 75 % Konfidenz. Für später, wenn Vertrauen da ist." },
];

export default function Start() {
  const router = useRouter();
  const [schritt, setSchritt] = useState(0);
  const [kostentraeger, setKostentraeger] = useState(true);
  const [personal, setPersonal] = useState(true);
  const [stufe, setStufe] = useState("ausgewogen");
  const [berater, setBerater] = useState("");
  const [mandant, setMandant] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  async function abschliessen(mitDatev: boolean) {
    const org = getOrgId();
    if (!org) return;
    setFehler(null);
    try {
      await api.patch(`/orgs/${org}/einstellungen`, {
        kostentraeger_modus: kostentraeger,
        lohn_muster_aktiv: personal,
        autopilot_stufe: stufe,
        ...(mitDatev && berater.trim() ? { datev_berater_nr: berater.trim() } : {}),
        ...(mitDatev && mandant.trim() ? { datev_mandant_nr: mandant.trim() } : {}),
      });
      router.push("/app/import/");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    }
  }

  const KNOPF = "knopf knopf-primaer px-6 py-3 text-[14.5px]";
  const LEISE = "text-[13px] font-semibold text-sand-500 underline-offset-2 hover:underline";

  return (
    <main className="min-h-screen bg-bento-bg px-6 py-10">
      <div className="mx-auto max-w-2xl">
      {/* Fortschritt */}
      <div className="mb-8 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={
              "h-2 flex-1 rounded-full transition " +
              (i <= schritt ? "bg-brand-600" : "bg-sand-200")
            }
          />
        ))}
      </div>

      {fehler && (
        <p className="mb-4 rounded-xl bg-status-crit-bg px-4 py-3 text-[13px] font-medium text-status-crit">{fehler}</p>
      )}

      {schritt === 0 && (
        <section className="rise">
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Zwei Fragen zu Ihrem Geschäft
          </h1>
          <p className="mt-1.5 text-[14px] text-sand-600">
            Daraus stellt sich der Buchungsalgorithmus selbst richtig ein.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setKostentraeger(!kostentraeger)}
              aria-pressed={kostentraeger}
              className={
                "block w-full rounded-[24px] border-2 p-5 text-left transition " +
                (kostentraeger ? "border-brand-600 bg-brand-50/60" : "border-sand-200 bg-white")
              }
            >
              <p className="text-[15px] font-bold text-sand-900">
                Rechnen Sie mit Pflege-/Krankenkassen ab? {kostentraeger ? "✓ Ja" : "Nein"}
              </p>
              <p className="mt-1 text-[13px] text-sand-600">
                Dann buchen Kassen-Eingänge als Kostenträger-Zahlung aufs
                Personenkonto — der Kern der Pflege-Fibu.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPersonal(!personal)}
              aria-pressed={personal}
              className={
                "block w-full rounded-[24px] border-2 p-5 text-left transition " +
                (personal ? "border-brand-600 bg-brand-50/60" : "border-sand-200 bg-white")
              }
            >
              <p className="text-[15px] font-bold text-sand-900">
                Zahlen Sie Löhne/Gehälter vom Geschäftskonto? {personal ? "✓ Ja" : "Nein"}
              </p>
              <p className="mt-1 text-[13px] text-sand-600">
                Dann erkennt der Algorithmus Gehaltsläufe am Verwendungszweck automatisch.
              </p>
            </button>
          </div>
          <div className="mt-7 flex items-center justify-between">
            <Link href="/app/import/" className={LEISE}>Überspringen</Link>
            <button type="button" onClick={() => setSchritt(1)} className={KNOPF}>Weiter</button>
          </div>
        </section>
      )}

      {schritt === 1 && (
        <section className="rise">
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Wie mutig soll der Autopilot starten?
          </h1>
          <p className="mt-1.5 text-[14px] text-sand-600">
            Jederzeit änderbar — und alles Automatische bleibt markiert und umkehrbar.
          </p>
          <div className="mt-6 space-y-3">
            {STUFEN.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStufe(s.key)}
                aria-pressed={stufe === s.key}
                className={
                  "block w-full rounded-[24px] border-2 p-5 text-left transition " +
                  (stufe === s.key ? "border-brand-600 bg-brand-50/60" : "border-sand-200 bg-white")
                }
              >
                <p className="flex items-center gap-2 text-[15px] font-bold text-sand-900">
                  {s.name}
                  {s.empfohlen && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-semibold text-brand-800">Empfohlen</span>
                  )}
                </p>
                <p className="mt-1 text-[13px] text-sand-600">{s.text}</p>
              </button>
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between">
            <button type="button" onClick={() => setSchritt(0)} className={LEISE}>Zurück</button>
            <button type="button" onClick={() => setSchritt(2)} className={KNOPF}>Weiter</button>
          </div>
        </section>
      )}

      {schritt === 2 && (
        <section className="rise">
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Arbeiten Sie mit einer Steuerkanzlei?
          </h1>
          <p className="mt-1.5 text-[14px] text-sand-600">
            Berater- und Mandanten-Nummer stehen im Kopf jeder DATEV-Datei —
            Ihre Kanzlei nennt sie Ihnen. Geht auch später.
          </p>
          <div className="mt-6 flex flex-wrap gap-5">
            <label>
              <span className="block text-[13px] font-semibold text-sand-700">Berater-Nr.</span>
              <input
                value={berater}
                onChange={(e) => setBerater(e.target.value)}
                placeholder="z. B. 1694291"
                className="tnum mt-1.5 w-44 rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] focus:border-brand-600 focus:outline-none"
              />
            </label>
            <label>
              <span className="block text-[13px] font-semibold text-sand-700">Mandanten-Nr.</span>
              <input
                value={mandant}
                onChange={(e) => setMandant(e.target.value)}
                placeholder="z. B. 10357"
                className="tnum mt-1.5 w-44 rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] focus:border-brand-600 focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-7 flex items-center justify-between">
            <button type="button" onClick={() => abschliessen(false)} className={LEISE}>
              Ohne Kanzlei fortfahren
            </button>
            <button type="button" onClick={() => abschliessen(true)} className={KNOPF}>
              Fertig — zum Bank-Import
            </button>
          </div>
        </section>
      )}
      </div>
    </main>
  );
}
