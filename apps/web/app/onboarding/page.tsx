"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

/* ============================================================
   Onboarding — 5 Schritte, Ziel: < 30 Minuten bis zur ersten
   automatisch vorkontierten Woche. Spezifikation: DESIGN.md § 5.
   Klickbarer Prototyp mit simulierten Ergebnissen.
   ============================================================ */

const SCHRITTE = [
  "Unternehmen",
  "Vorjahr",
  "Bank",
  "Erkennung",
  "Kanzlei",
  "Autopilot",
] as const;

function Fortschritt({ aktiv }: { aktiv: number }) {
  return (
    <ol className="flex items-center gap-2">
      {SCHRITTE.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={
              "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold " +
              (i < aktiv
                ? "bg-brand-700 text-white"
                : i === aktiv
                  ? "border-2 border-brand-700 bg-white text-brand-800"
                  : "border border-sand-300 bg-white text-sand-400")
            }
          >
            {i < aktiv ? "✓" : i + 1}
          </span>
          <span
            className={
              "hidden text-[13px] font-medium sm:block " +
              (i === aktiv ? "text-sand-900" : "text-sand-500")
            }
          >
            {s}
          </span>
          {i < SCHRITTE.length - 1 && (
            <span
              aria-hidden
              className={
                "h-px w-6 sm:w-10 " + (i < aktiv ? "bg-brand-600" : "bg-sand-300")
              }
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function Karte({ children }: { children: React.ReactNode }) {
  return (
    <div className="rise tile p-7 sm:p-9">
      {children}
    </div>
  );
}

function Aktionen({
  zurueck,
  weiter,
  weiterLabel = "Weiter",
  weiterAktiv = true,
}: {
  zurueck?: () => void;
  weiter: () => void;
  weiterLabel?: string;
  weiterAktiv?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-sand-100 pt-6">
      {zurueck ? (
        <button
          type="button"
          onClick={zurueck}
          className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-sand-600 transition hover:text-sand-900"
        >
          ← Zurück
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={weiter}
        disabled={!weiterAktiv}
        className="knopf knopf-primaer px-7 py-3 text-[15px] shadow-md shadow-brand-700/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {weiterLabel}
      </button>
    </div>
  );
}

/* ---------- Schritt 1: Unternehmen ---------- */
function SchrittFirma({ weiter }: { weiter: () => void }) {
  const [name, setName] = useState("");
  const [form, setForm] = useState("GmbH");
  const [branche, setBranche] = useState("Ambulante Pflege");
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Willkommen! Wer sind Sie?
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        Drei Angaben — daraus richtet {BRAND.name} Ihre Buchhaltung fachlich
        korrekt ein.
      </p>
      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-[13px] font-semibold text-sand-700">
            Name des Unternehmens
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Pflegedienst Sonnenweg GmbH"
            className="mt-1.5 w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] text-sand-900 placeholder:text-sand-400 focus:border-brand-600 focus:outline-none"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-semibold text-sand-700">
              Rechtsform
            </span>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] text-sand-900 focus:border-brand-600 focus:outline-none"
            >
              {["GmbH", "gGmbH", "UG", "e. V.", "Einzelunternehmen"].map(
                (f) => (
                  <option key={f}>{f}</option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-sand-700">
              Branche
            </span>
            <select
              value={branche}
              onChange={(e) => setBranche(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] text-sand-900 focus:border-brand-600 focus:outline-none"
            >
              {[
                "Ambulante Pflege",
                "Tagespflege",
                "Betreuungsdienst",
                "Sozialwirtschaft (sonstige)",
              ].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
        </div>
        {/* Sichtbare Konsequenz statt stummem Formular */}
        <div className="rounded-2xl bg-tile-mint/70 px-5 py-4">
          <p className="text-[13px] font-semibold text-brand-900">
            Das richten wir daraus ein:
          </p>
          <ul className="mt-1.5 space-y-1 text-[13.5px] text-brand-900/80">
            <li>
              ✓ Kontenrahmen <strong>SKR45</strong> (Gesundheitswesen) mit
              Pflegegrad- und Kostenträger-Konten
            </li>
            <li>
              ✓ Umsatzsteuer: <strong>§ 4 Nr. 16 UStG</strong> — steuerfrei,
              brutto gebucht
            </li>
            <li>✓ Muster für Gehälter, SV-Beiträge und Kassen-Zahlungen</li>
          </ul>
        </div>
      </div>
      <Aktionen weiter={weiter} weiterAktiv={name.trim().length > 1} />
    </Karte>
  );
}

/* ---------- Schritt 2: Vorjahr (Bilanzkontinuität) ---------- */
function SchrittVorjahr({
  weiter,
  zurueck,
}: {
  weiter: () => void;
  zurueck: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "liest" | "fertig">("idle");
  function upload() {
    setStatus("liest");
    window.setTimeout(() => setStatus("fertig"), 1600);
  }
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Haben Sie einen Jahresabschluss vom Vorjahr?
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        Optional — aber Gold wert: {BRAND.name} übernimmt Ihre bisherigen
        Konten und verwendet sie bevorzugt weiter. So bleibt Ihre Bilanz über
        die Jahre vergleichbar (<strong>Bilanzkontinuität</strong>) — Kanzlei
        und Betriebsprüfung danken es.
      </p>
      {status !== "fertig" ? (
        <button
          type="button"
          onClick={upload}
          disabled={status === "liest"}
          className="mt-6 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-sand-300 bg-sand-50/60 px-6 py-10 text-center transition hover:border-brand-500 disabled:opacity-70"
        >
          {status === "liest" ? (
            <>
              <span
                aria-hidden
                className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
              />
              <span className="text-[14px] font-semibold text-sand-700">
                Lese Kontennachweis &amp; Salden …
              </span>
            </>
          ) : (
            <>
              <span aria-hidden className="text-2xl">
                ⇪
              </span>
              <span className="text-[15px] font-semibold text-sand-800">
                Jahresabschluss oder Summen-/Saldenliste hochladen
              </span>
              <span className="text-[12.5px] text-sand-500">
                PDF, CSV oder E-Bilanz — auch mehrere Jahre möglich
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="mt-6 rounded-2xl bg-tile-mint/70 px-5 py-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-status-good">
            ✓ Jahresabschluss 2025 gelesen
          </p>
          <ul className="tnum mt-2 space-y-1 text-[13.5px] text-brand-900/85">
            <li>• Kontenrahmen erkannt: SKR45 (Gesundheitswesen)</li>
            <li>
              • <strong>78 bebuchte Konten</strong> übernommen — inkl. Ihrer
              Individualkonten
            </li>
            <li>
              • Eröffnungswerte als Saldenvortrag vorbereitet (Ihre Kanzlei
              bestätigt sie)
            </li>
          </ul>
          <p className="mt-2 text-[12.5px] text-brand-900/60">
            Diese Konten werden bei Vorschlägen bevorzugt — Ihre Bilanz bleibt
            an das Vorjahr anschlussfähig.
          </p>
        </div>
      )}
      <div className="mt-8 flex items-center justify-between border-t border-sand-100 pt-6">
        <button
          type="button"
          onClick={zurueck}
          className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-sand-600 transition hover:text-sand-900"
        >
          ← Zurück
        </button>
        <div className="flex items-center gap-4">
          {status !== "fertig" && (
            <button
              type="button"
              onClick={weiter}
              className="text-[13.5px] font-semibold text-sand-500 underline-offset-2 transition hover:text-sand-800 hover:underline"
            >
              Ohne Vorjahr starten
            </button>
          )}
          <button
            type="button"
            onClick={weiter}
            disabled={status === "liest"}
            className="knopf knopf-primaer px-7 py-3 text-[15px] shadow-md shadow-brand-700/20 disabled:opacity-40"
          >
            Weiter
          </button>
        </div>
      </div>
    </Karte>
  );
}

/* ---------- Schritt 3: Bank ---------- */
function SchrittBank({
  weiter,
  zurueck,
}: {
  weiter: () => void;
  zurueck: () => void;
}) {
  const [bank, setBank] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "laedt" | "fertig">("idle");
  function verbinden(b: string) {
    setBank(b);
    setStatus("laedt");
    window.setTimeout(() => setStatus("fertig"), 1400);
  }
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Bank verbinden
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        Lesezugriff über die offizielle Bankenschnittstelle — Ihre Zugangsdaten
        bleiben bei Ihrer Bank, {BRAND.name} kann nichts überweisen.
      </p>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {[
          "Sparkasse",
          "Volksbank / Raiffeisenbank",
          "Commerzbank",
          "Deutsche Bank",
          "Postbank",
          "Andere Bank …",
        ].map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => verbinden(b)}
            className={
              "rounded-2xl border px-4 py-3.5 text-left text-[14px] font-semibold transition " +
              (bank === b
                ? "border-brand-700 bg-brand-50 text-brand-800"
                : "border-sand-200 bg-white text-sand-800 hover:border-brand-500")
            }
          >
            {b}
          </button>
        ))}
      </div>
      {status !== "idle" && (
        <div className="zeile-soft mt-5 px-5 py-4">
          {status === "laedt" ? (
            <p className="flex items-center gap-2.5 text-[14px] text-sand-700">
              <span
                aria-hidden
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
              />
              Verbinde mit {bank} … Umsätze werden geladen
            </p>
          ) : (
            <div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-status-good">
                ✓ Verbunden mit {bank}
              </p>
              <p className="tnum mt-1 text-[13.5px] text-sand-700">
                11.234 Umsätze aus 24 Monaten geladen · 2 Konten erkannt
              </p>
            </div>
          )}
        </div>
      )}
      <Aktionen
        zurueck={zurueck}
        weiter={weiter}
        weiterAktiv={status === "fertig"}
      />
    </Karte>
  );
}

/* ---------- Schritt 3: Erkennung (Magic-Moment) ---------- */
function SchrittErkennung({
  weiter,
  zurueck,
}: {
  weiter: () => void;
  zurueck: () => void;
}) {
  const [zeigen, setZeigen] = useState(0);
  useEffect(() => {
    const t = window.setInterval(
      () => setZeigen((z) => Math.min(z + 1, 4)),
      420,
    );
    return () => window.clearInterval(t);
  }, []);
  const befunde = [
    { zahl: "12", text: "Kostenträger erkannt", sub: "AOK, TK, DAK, BARMER … als Zahler zugeordnet" },
    { zahl: "47", text: "Gehaltsempfänger", sub: "monatliche Lohnläufe als Muster erkannt" },
    { zahl: "31", text: "Lieferanten & Verträge", sub: "Miete, Kfz, Telefon, Pflegebedarf …" },
    { zahl: "86 %", text: "der Umsätze wiederkehrend", sub: "das bucht künftig der Autopilot" },
  ];
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Wir haben Ihre Buchhaltung schon einmal gelesen.
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        Kein Einrichten von Regeln, kein Kontenplan-Studium — das hier hat
        {" "}{BRAND.name} aus Ihren Umsätzen selbst verstanden:
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {befunde.map((b, i) => (
          <div
            key={b.text}
            className={
              "zeile-soft px-5 py-4 transition-all duration-500 " +
              (zeigen > i ? "opacity-100" : "translate-y-2 opacity-0")
            }
          >
            <p className="tnum zahl-hero text-2xl text-brand-700">
              {b.zahl}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-sand-900">
              {b.text}
            </p>
            <p className="text-[12.5px] text-sand-600">{b.sub}</p>
          </div>
        ))}
      </div>
      <div
        className={
          "mt-4 flex items-center gap-2.5 rounded-2xl bg-tile-mint/70 px-4 py-3 transition-opacity duration-500 " +
          (zeigen >= 4 ? "opacity-100" : "opacity-0")
        }
      >
        <span aria-hidden className="text-status-good">✓</span>
        <p className="text-[13px] text-brand-900/85">
          <strong className="tnum">78 Bestandskonten</strong> aus Ihrem
          Abschluss 2025 werden bevorzugt weiterverwendet — Ihre Bilanz bleibt
          kontinuierlich.
        </p>
      </div>
      <p
        className={
          "mt-4 text-[13px] text-sand-500 transition-opacity duration-500 " +
          (zeigen >= 4 ? "opacity-100" : "opacity-0")
        }
      >
        Alles davon sind Vorschläge — nichts ist gebucht, bevor Sie oder der
        Autopilot es freigeben.
      </p>
      <Aktionen zurueck={zurueck} weiter={weiter} weiterAktiv={zeigen >= 4} />
    </Karte>
  );
}

/* ---------- Schritt 4: Kanzlei ---------- */
function SchrittKanzlei({
  weiter,
  zurueck,
}: {
  weiter: () => void;
  zurueck: () => void;
}) {
  const [weg, setWeg] = useState("entwurf");
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Ihre Steuerkanzlei
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        {BRAND.name} ersetzt nicht Ihre Kanzlei — es liefert ihr fertige,
        Cent-geprüfte Monatsstapel. Wie soll die Übergabe laufen?
      </p>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[13px] font-semibold text-sand-700">
            Kanzlei (optional — geht auch später)
          </span>
          <input
            placeholder="z. B. Steuerkanzlei Meyer & Kollegen"
            className="mt-1.5 w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-[15px] text-sand-900 placeholder:text-sand-400 focus:border-brand-600 focus:outline-none"
          />
        </label>
        <div className="space-y-2.5">
          {[
            {
              id: "entwurf",
              titel: "Direkt nach DATEV (empfohlen)",
              text: "Stapel landet als prüfbarer Entwurf im Rechnungswesen der Kanzlei — nichts wird ohne sie festgeschrieben.",
            },
            {
              id: "extf",
              titel: "Als DATEV-Datei (EXTF)",
              text: "Klassischer Import — funktioniert mit jeder Kanzlei, ganz ohne Umstellung dort.",
            },
            {
              id: "spaeter",
              titel: "Erstmal ohne Kanzlei-Anbindung",
              text: "Sie können jederzeit exportieren; die Anbindung folgt, wenn Sie so weit sind.",
            },
          ].map((o) => (
            <label
              key={o.id}
              className={
                "flex cursor-pointer gap-3 rounded-2xl border px-5 py-4 transition " +
                (weg === o.id
                  ? "border-brand-600 bg-brand-50/60"
                  : "border-sand-200 hover:border-sand-300")
              }
            >
              <input
                type="radio"
                name="weg"
                checked={weg === o.id}
                onChange={() => setWeg(o.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand-700)]"
              />
              <span>
                <span className="block text-[14.5px] font-semibold text-sand-900">
                  {o.titel}
                </span>
                <span className="block text-[13px] leading-relaxed text-sand-600">
                  {o.text}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <Aktionen zurueck={zurueck} weiter={weiter} />
    </Karte>
  );
}

/* ---------- Schritt 5: Autopilot ---------- */
function SchrittAutopilot({ zurueck }: { zurueck: () => void }) {
  const [stufe, setStufe] = useState("ausgewogen");
  const [fertig, setFertig] = useState(false);
  if (fertig) {
    return (
      <Karte>
        <div className="py-6 text-center">
          <span
            aria-hidden
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-good-bg text-3xl text-status-good"
          >
            ✓
          </span>
          <h1 className="font-display mt-5 text-2xl font-semibold text-sand-900">
            Der Autopilot arbeitet jetzt.
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-sand-600">
            Die ersten Wochen sind bereits vorkontiert. Alles, was eine
            Entscheidung von Ihnen braucht, wartet in der Prüfliste — im
            Schnitt ein paar Minuten pro Woche.
          </p>
          <Link
            href="/demo"
            className="knopf knopf-primaer mt-7 inline-block px-7 py-3 text-[15px] shadow-md shadow-brand-700/20"
          >
            Zum Dashboard →
          </Link>
        </div>
      </Karte>
    );
  }
  return (
    <Karte>
      <h1 className="font-display text-2xl font-semibold text-sand-900">
        Wie mutig darf der Autopilot sein?
      </h1>
      <p className="mt-2 text-[14.5px] text-sand-600">
        Egal welche Stufe: jede automatische Buchung ist begründet,
        protokolliert und mit einem Klick umkehrbar. Sie können jederzeit
        wechseln.
      </p>
      <div className="mt-6 space-y-2.5">
        {[
          {
            id: "vorsichtig",
            titel: "Vorsichtig",
            text: "bucht nur exakte Zahlungs-Zuordnungen — alles andere fragt",
          },
          {
            id: "ausgewogen",
            titel: "Ausgewogen (empfohlen)",
            text: "bucht sichere Muster & bestätigte Regeln automatisch",
          },
          {
            id: "mutig",
            titel: "Mutig",
            text: "bucht auch gelernte Muster schon ab 2 Bestätigungen",
          },
        ].map((o) => (
          <label
            key={o.id}
            className={
              "flex cursor-pointer gap-3 rounded-2xl border px-5 py-4 transition " +
              (stufe === o.id
                ? "border-brand-600 bg-brand-50/60"
                : "border-sand-200 hover:border-sand-300")
            }
          >
            <input
              type="radio"
              name="stufe"
              checked={stufe === o.id}
              onChange={() => setStufe(o.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand-700)]"
            />
            <span>
              <span className="block text-[14.5px] font-semibold text-sand-900">
                {o.titel}
              </span>
              <span className="block text-[13px] text-sand-600">{o.text}</span>
            </span>
          </label>
        ))}
      </div>
      <Aktionen
        zurueck={zurueck}
        weiter={() => setFertig(true)}
        weiterLabel="Autopilot starten"
      />
    </Karte>
  );
}

export default function Onboarding() {
  const [schritt, setSchritt] = useState(0);
  const weiter = () => setSchritt((s) => Math.min(s + 1, 5));
  const zurueck = () => setSchritt((s) => Math.max(s - 1, 0));
  return (
    <main className="min-h-screen bg-bento-bg px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-7 flex flex-col items-center gap-5">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span
              aria-hidden
              className="relative top-[1px] inline-block h-3.5 w-3.5 rounded-[5px] bg-brand-600"
            >
              <span className="absolute inset-[3.5px] rounded-full bg-bento-bg" />
            </span>
            <span className="font-display text-xl font-semibold text-sand-900">
              {BRAND.name}
            </span>
          </Link>
          <Fortschritt aktiv={schritt} />
        </div>
        {schritt === 0 && <SchrittFirma weiter={weiter} />}
        {schritt === 1 && <SchrittVorjahr weiter={weiter} zurueck={zurueck} />}
        {schritt === 2 && <SchrittBank weiter={weiter} zurueck={zurueck} />}
        {schritt === 3 && (
          <SchrittErkennung weiter={weiter} zurueck={zurueck} />
        )}
        {schritt === 4 && <SchrittKanzlei weiter={weiter} zurueck={zurueck} />}
        {schritt === 5 && <SchrittAutopilot zurueck={zurueck} />}
        <p className="mt-6 text-center text-[12px] text-sand-500">
          Demo-Flow mit simulierten Ergebnissen — so fühlt sich der echte
          Start an.
        </p>
      </div>
    </main>
  );
}
