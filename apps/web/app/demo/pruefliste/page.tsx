"use client";

import { useState } from "react";

/* ============================================================
   Prüfliste — das Kern-Interaktionsmuster des Produkts:
   * Die Bankseite ist FIXIERT (unveränderlich, Vertrauen).
   * Das Gegenkonto kommt als begründeter Vorschlag + smarte
     Alternativen (Regel / gelernt / häufig / Erstattung).
   * Jede Bestätigung trainiert den Autopiloten sichtbar.
   Voll klickbar mit Beispieldaten — kein Backend.
   ============================================================ */

type Chip = {
  konto: string;
  label: string;
  art: "vorschlag" | "gelernt" | "haeufig" | "erstattung";
};

type Item = {
  id: number;
  datum: string;
  text: string;
  betrag: string; // Anzeige
  einnahme: boolean;
  grund: string;
  chips: Chip[];
  regelHinweis?: string; // Text der „Als Regel merken"-Option
  grundbuchungen?: { datum: string; text: string; betrag: string }[];
};

const START_ITEMS: Item[] = [
  {
    id: 1,
    datum: "28.06.",
    text: "Überweisung Stadtwerke Norden",
    betrag: "−418,22 €",
    einnahme: false,
    grund: "Neuer Empfänger — einmal bestätigen, dann läuft es automatisch.",
    chips: [
      { konto: "6720", label: "Strom", art: "vorschlag" },
      { konto: "6700", label: "Wasser/Energie", art: "haeufig" },
      { konto: "6730", label: "Heizung", art: "haeufig" },
      { konto: "6840", label: "Sonst. Verwaltungsbedarf", art: "haeufig" },
    ],
    regelHinweis: "Stadtwerke Norden künftig immer so buchen",
  },
  {
    id: 2,
    datum: "27.06.",
    text: "Gutschrift AOK Rückläufer",
    betrag: "+96,40 €",
    einnahme: true,
    grund:
      "Sieht nach einer Erstattung aus — bitte der ursprünglichen Buchung zuordnen.",
    chips: [
      { konto: "→", label: "Erstattung zur Grundbuchung", art: "erstattung" },
      { konto: "4830", label: "Sonstige Erstattungen", art: "haeufig" },
    ],
    grundbuchungen: [
      { datum: "12.06.", text: "AOK Beitragszahlung (SV)", betrag: "96,40 €" },
      { datum: "03.06.", text: "AOK Sammelavis-Teilposten", betrag: "96,40 €" },
    ],
  },
  {
    id: 3,
    datum: "26.06.",
    text: "SEPA-Sammelüberweisung (63 Posten)",
    betrag: "−59.184,00 €",
    einnahme: false,
    grund: "Betrag und Rhythmus passen zum Lohn-Muster — kurze Bestätigung.",
    chips: [
      { konto: "3500", label: "Lohn & Gehalt", art: "vorschlag" },
      { konto: "3510", label: "SV-Beiträge", art: "haeufig" },
    ],
    regelHinweis: "Monatliche Sammelüberweisung als Gehaltslauf merken",
  },
  {
    id: 4,
    datum: "24.06.",
    text: "Kartenzahlung Bäckerei Freud",
    betrag: "−38,90 €",
    einnahme: false,
    grund: "Ohne Beleg nicht eindeutig — Konto wählen oder Beleg nachreichen.",
    chips: [
      { konto: "6880", label: "Bewirtung", art: "haeufig" },
      { konto: "6500", label: "Lebensmittel", art: "haeufig" },
      { konto: "6690", label: "Betreuungsaufwand", art: "haeufig" },
    ],
  },
  {
    id: 5,
    datum: "23.06.",
    text: "Finanzamt Leer — Rate",
    betrag: "−7.000,00 €",
    einnahme: false,
    grund: "Verwendungszweck nennt keine Steuerart — welche ist es?",
    chips: [
      { konto: "3504", label: "Lohnsteuer", art: "haeufig" },
      { konto: "3640", label: "Umsatzsteuer-VZ", art: "haeufig" },
      { konto: "7100", label: "Körperschaftsteuer", art: "haeufig" },
    ],
  },
  {
    id: 6,
    datum: "21.06.",
    text: "Eingang R. Hartmann",
    betrag: "+2.400,00 €",
    einnahme: true,
    grund: "Kein offener Posten in dieser Höhe — wer ist der Absender?",
    chips: [
      { konto: "10xxx", label: "Privatzahler (neues Personenkonto)", art: "vorschlag" },
      { konto: "4086", label: "Private Pflegeleistungen", art: "haeufig" },
      { konto: "5500", label: "Sonstige Erträge", art: "haeufig" },
    ],
  },
];

const ART_STIL: Record<Chip["art"], { chip: string; tag: string }> = {
  vorschlag: {
    chip: "border-brand-600 bg-brand-50 text-brand-800",
    tag: "Vorschlag",
  },
  gelernt: { chip: "border-sand-300 bg-white text-sand-800", tag: "gelernt" },
  haeufig: { chip: "border-sand-300 bg-white text-sand-800", tag: "häufig" },
  erstattung: {
    chip: "border-cat-3/60 bg-white text-sand-800",
    tag: "Erstattung",
  },
};

function Toast({ text }: { text: string }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-brand-200 bg-white px-5 py-3 shadow-xl">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-sand-900">
        <span className="text-status-good" aria-hidden>
          ✓
        </span>
        {text}
      </p>
    </div>
  );
}

function ItemKarte({
  item,
  offen,
  onToggle,
  onBuchen,
}: {
  item: Item;
  offen: boolean;
  onToggle: () => void;
  onBuchen: (lernen: boolean) => void;
}) {
  const [gewaehlt, setGewaehlt] = useState<Chip>(item.chips[0]);
  const [grundbuchung, setGrundbuchung] = useState(0);
  const [lernen, setLernen] = useState(Boolean(item.regelHinweis));
  const istErstattung = gewaehlt.art === "erstattung";

  return (
    <li className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm transition">
      {/* Kopfzeile */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        className="flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-4 text-left transition hover:bg-sand-50"
      >
        <span className="tnum w-11 shrink-0 text-[12px] text-sand-500">
          {item.datum}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-sand-900">
            {item.text}
          </span>
          <span className="block truncate text-[12.5px] text-sand-500">
            {item.grund}
          </span>
        </span>
        <span
          className={
            "tnum shrink-0 text-[15px] font-bold " +
            (item.einnahme ? "text-status-good" : "text-sand-900")
          }
        >
          {item.betrag}
        </span>
        <span
          aria-hidden
          className={
            "shrink-0 text-sand-400 transition-transform " +
            (offen ? "rotate-180" : "")
          }
        >
          ▾
        </span>
      </button>

      {/* Bearbeitungs-Panel */}
      {offen && (
        <div className="border-t border-sand-100 bg-sand-50/50 px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            {/* Bankseite — fixiert */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                {item.einnahme ? "Geld eingegangen auf" : "Bezahlt von"}
              </p>
              <div className="mt-2 rounded-xl border border-sand-200 bg-white px-4 py-3">
                <p className="tnum font-semibold text-sand-900">1260 · Bank</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-sand-500">
                  <span aria-hidden>🔒</span> fixiert — die Bankseite stimmt
                  immer
                </p>
              </div>
            </div>

            {/* Gegenkonto — Auswahl */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                {item.einnahme ? "Wofür war das Geld?" : "Wofür war die Ausgabe?"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.chips.map((c) => {
                  const aktiv = gewaehlt.konto === c.konto;
                  return (
                    <button
                      key={c.konto + c.label}
                      type="button"
                      onClick={() => setGewaehlt(c)}
                      className={
                        "rounded-xl border px-3.5 py-2 text-[13px] font-medium transition " +
                        (aktiv
                          ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                          : ART_STIL[c.art].chip + " hover:border-brand-500")
                      }
                    >
                      <span className="tnum">{c.konto}</span> · {c.label}
                      <span
                        className={
                          "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                          (aktiv
                            ? "bg-white/20 text-white"
                            : "bg-sand-100 text-sand-500")
                        }
                      >
                        {ART_STIL[c.art].tag}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Erstattungs-Zuordnung: konkrete Grundbuchungen */}
              {istErstattung && item.grundbuchungen && (
                <div className="mt-4">
                  <p className="text-[12px] font-semibold text-sand-700">
                    Welche Buchung wird erstattet?
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {item.grundbuchungen.map((g, i) => (
                      <label
                        key={g.datum + g.text}
                        className={
                          "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] transition " +
                          (grundbuchung === i
                            ? "border-brand-600 bg-white"
                            : "border-sand-200 bg-white/60 hover:border-sand-300")
                        }
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`gb-${item.id}`}
                            checked={grundbuchung === i}
                            onChange={() => setGrundbuchung(i)}
                            className="accent-[var(--color-brand-700)]"
                          />
                          <span className="text-sand-800">
                            <span className="tnum text-sand-500">{g.datum}</span>{" "}
                            {g.text}
                          </span>
                        </span>
                        <span className="tnum font-semibold text-sand-900">
                          {g.betrag}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-sand-500">
                    Gebucht wird gegen das Konto der Grundbuchung — der Betrag
                    mindert sie, sauber über dasselbe Personenkonto.
                  </p>
                </div>
              )}

              {/* USt-Hinweis (SKR45-Kontext) */}
              {!istErstattung && (
                <p className="mt-3 text-[12px] text-sand-500">
                  Umsatzsteuer: <strong>keine</strong> — Pflegeleistungen sind
                  nach § 4 Nr. 16 UStG steuerfrei, gebucht wird brutto.
                  {" "}Abweichende Fälle wählen den Steuerschlüssel hier.
                </p>
              )}

              {/* Lern-Option + Aktionen */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 pt-4">
                {item.regelHinweis ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-sand-700">
                    <input
                      type="checkbox"
                      checked={lernen}
                      onChange={(e) => setLernen(e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-brand-700)]"
                    />
                    {item.regelHinweis}
                  </label>
                ) : (
                  <span className="text-[12px] text-sand-500">
                    Nach 3 gleichen Bestätigungen bucht das künftig der
                    Autopilot.
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onToggle}
                    className="rounded-xl border border-sand-300 px-4 py-2 text-[13px] font-semibold text-sand-700 transition hover:border-sand-400"
                  >
                    Später
                  </button>
                  <button
                    type="button"
                    onClick={() => onBuchen(lernen)}
                    className="rounded-xl bg-brand-700 px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800"
                  >
                    Buchen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Pruefliste() {
  const [items, setItems] = useState(START_ITEMS);
  const [offenId, setOffenId] = useState<number | null>(1);
  const [toast, setToast] = useState<string | null>(null);
  const erledigt = START_ITEMS.length - items.length;

  function buchen(id: number, lernen: boolean) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setOffenId(null);
    setToast(
      lernen
        ? "Gebucht — Muster gelernt, ab jetzt bucht das der Autopilot."
        : "Gebucht — der Autopilot merkt sich Ihre Antwort.",
    );
    window.setTimeout(() => setToast(null), 3200);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-sand-900">
            Prüfliste
          </h1>
          <p className="mt-1 text-[14px] text-sand-600">
            {items.length === 0
              ? "Alles entschieden — der Rest lief automatisch."
              : `${items.length} Entscheidung${items.length === 1 ? "" : "en"} — alles andere hat der Autopilot erledigt.`}
          </p>
        </div>
        {/* Fortschritt */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-sand-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{
                width: `${(erledigt / START_ITEMS.length) * 100}%`,
              }}
            />
          </div>
          <span className="tnum text-[13px] font-semibold text-sand-700">
            {erledigt}/{START_ITEMS.length}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-brand-200 bg-white px-8 py-16 text-center shadow-sm">
          <span
            aria-hidden
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-good-bg text-2xl text-status-good"
          >
            ✓
          </span>
          <h2 className="font-display mt-4 text-xl font-semibold text-sand-900">
            Monat erledigt.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-sand-600">
            Alle 737 Juni-Umsätze sind verbucht, der Saldenabgleich ist
            Cent-genau. Der DATEV-Stapel wartet unter{" "}
            <a href="/demo/datev" className="font-semibold text-brand-700 underline">
              DATEV
            </a>{" "}
            auf den Versand an Ihre Kanzlei.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <ItemKarte
              key={it.id}
              item={it}
              offen={offenId === it.id}
              onToggle={() => setOffenId(offenId === it.id ? null : it.id)}
              onBuchen={(lernen) => buchen(it.id, lernen)}
            />
          ))}
        </ul>
      )}

      <p className="text-[12px] text-sand-500">
        Jede automatische Buchung finden Sie mit Begründung im{" "}
        <a href="/demo" className="font-medium text-brand-700 underline">
          Autopilot-Protokoll
        </a>{" "}
        — und holen sie dort mit einem Klick zurück.
      </p>

      {toast && <Toast text={toast} />}
    </main>
  );
}
