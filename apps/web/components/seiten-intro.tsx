"use client";

/* Seiten-Onboarding: Beim ERSTEN Besuch jedes Menüpunkts erklärt eine
   Bento-Karte, was man hier tun kann (localStorage je Seite). Über den
   ?-Knopf im Kopf jederzeit wiederholbar. Kein Server-Zustand — bewusst
   leichtgewichtig, pro Browser. */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Intro = { titel: string; emoji: string; punkte: string[] };

const INTROS: Record<string, Intro> = {
  "/app": {
    titel: "Ihre Übersicht",
    emoji: "🧭",
    punkte: [
      "Die große Kachel zeigt, wie viel der Autopilot diesen Monat schon erledigt hat — echte Zahlen, keine Schätzung.",
      "Der Cent-Anker prüft jeden Monat auf den Cent gegen Ihr Bankkonto: 0,00 € heißt, es fehlt nichts.",
      "„Als Nächstes für Sie“ sind die Fälle, die Ihre Entscheidung brauchen — ein Klick führt zur Prüfliste.",
    ],
  },
  "/app/pruefliste": {
    titel: "Die Prüfliste",
    emoji: "☑️",
    punkte: [
      "Hier landet nur, was der Autopilot nicht sicher wusste — alles andere ist schon gebucht.",
      "Karte aufklappen: Das Bankkonto ist fixiert, Sie wählen nur das Gegenkonto. Der Vorschlag steht mit Begründung dabei.",
      "„Künftig immer so buchen“ merkt sich die Antwort als Regel — derselbe Partner läuft ab dann automatisch.",
    ],
  },
  "/app/import": {
    titel: "Der Bank-Import",
    emoji: "🏦",
    punkte: [
      "Laden Sie den CSV-Export aus Ihrem Online-Banking hoch (Sparkasse, VR, comdirect …).",
      "Bereits bekannte Umsätze werden erkannt und übersprungen — doppelt importieren geht nicht.",
      "Direkt nach dem Upload kontiert und bucht der Autopilot; das Ergebnis sehen Sie sofort in Zahlen.",
    ],
  },
  "/app/datev": {
    titel: "Die DATEV-Übergabe",
    emoji: "📦",
    punkte: [
      "Ein Monat wird erst übergabereif, wenn er Cent-genau ist und keine offenen Fälle mehr hat.",
      "„Stapeln“ friert die Buchungen ein und erzeugt die EXTF-Datei für Ihre Steuerkanzlei.",
      "Nach dem Import in der Kanzlei markieren Sie den Stapel — erst dann gelten die Sätze als endgültig gebucht.",
    ],
  },
  "/app/einstellungen": {
    titel: "Die Einstellungen",
    emoji: "⚙️",
    punkte: [
      "Die Autopilot-Stufe bestimmt, wie mutig automatisch gebucht wird — jede Karte zeigt vorher, was sie jetzt buchen würde.",
      "Der Not-Aus holt den letzten automatischen Lauf komplett in die Prüfliste zurück.",
      "Unter Partner-Regeln sehen Sie, was das System gelernt hat — jede Regel mit ihrer Wirkungszahl, jederzeit abschaltbar.",
    ],
  },
  "/app/kanzlei": {
    titel: "Das Kanzlei-Cockpit",
    emoji: "🏛️",
    punkte: [
      "Alle Mandate auf einen Blick, sortiert nach Handlungsbedarf — Cent-Anker, offene Fälle, Stapel, Rückfragen.",
      "„Mandat öffnen“ wechselt in die Sicht des Unternehmens (lesend; Einstellungen bleiben beim Mandanten).",
      "Rückfragen hängen direkt an der Buchung — kein E-Mail-Ping-Pong mit Kontoauszug-Anhängen.",
    ],
  },
};

function schluessel(pfad: string): string {
  const p = pfad.replace(/\/+$/, "") || "/app";
  return p in INTROS ? p : "";
}

export default function SeitenIntro({ pfad }: { pfad: string }) {
  const key = schluessel(pfad);
  const [offen, setOffen] = useState(false);
  // Portal auf document.body: der Header (backdrop-blur) wäre sonst
  // Containing Block für position:fixed — Overlay klebte oben (MobileNav-Lektion).
  const [montiert, setMontiert] = useState(false);
  useEffect(() => setMontiert(true), []);

  useEffect(() => {
    if (!key) return;
    const gesehen = window.localStorage.getItem(`kk_intro_${key}`);
    if (!gesehen) setOffen(true);
  }, [key]);

  const schliessen = useCallback(() => {
    if (key) window.localStorage.setItem(`kk_intro_${key}`, "1");
    setOffen(false);
  }, [key]);

  if (!key) return null;
  const intro = INTROS[key];

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Was kann ich hier tun?"
        aria-label="Erklärung dieser Seite anzeigen"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[15px] font-bold text-brand-700 shadow-sm transition hover:bg-brand-50"
      >
        ?
      </button>

      {montiert && offen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Erklärung: ${intro.titel}`}
          onClick={schliessen}
        >
          <div
            className="tile rise w-full max-w-lg p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-bold uppercase tracking-wider text-brand-700">
              Kurz erklärt
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">
              {intro.titel} <span aria-hidden>{intro.emoji}</span>
            </h2>
            <ul className="mt-5 space-y-3.5">
              {intro.punkte.map((p, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tile-mint text-[12px] font-bold text-tile-mint-ink"
                  >
                    {i + 1}
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center justify-between">
              <p className="text-[12px] text-sand-500">
                Jederzeit wieder über den ?-Knopf oben rechts.
              </p>
              <button
                type="button"
                onClick={schliessen}
                className="knopf knopf-primaer px-6 py-2.5 text-[14px]"
              >
                Alles klar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
