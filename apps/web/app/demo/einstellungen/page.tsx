/* Einstellungen: die wenigen Stellschrauben, die es wirklich braucht —
   Vertrauensaufbau (Autopilot-Stufe), Verbindungen, Kanzlei-Zugang. */

function Karte({
  titel,
  sub,
  children,
}: {
  titel: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tile p-6">
      <h2 className="text-[14px] font-bold text-ink">{titel}</h2>
      <p className="mt-0.5 text-[13px] text-sand-600">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Zeile({
  label,
  wert,
  status,
}: {
  label: string;
  wert: string;
  status?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between border-b border-sand-100 py-3 text-[13.5px] last:border-0">
      <span className="text-sand-700">{label}</span>
      <span
        className={
          "font-semibold " +
          (status === "ok"
            ? "text-status-good"
            : status === "warn"
              ? "text-status-warn"
              : "text-sand-900")
        }
      >
        {status === "ok" && <span aria-hidden>✓ </span>}
        {wert}
      </span>
    </div>
  );
}

export default function EinstellungenSeite() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">
          Einstellungen
        </h1>
        <p className="mt-1 text-[14px] text-sand-600">
          Wenige Stellschrauben — der Rest konfiguriert sich aus Ihren Daten.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Karte
          titel="Autopilot"
          sub="Wie viel darf automatisch gebucht werden?"
        >
          <div className="space-y-2.5">
            {[
              {
                stufe: "Vorsichtig",
                text: "nur exakte Zahlungs-Zuordnungen",
                aktiv: false,
              },
              {
                stufe: "Ausgewogen",
                text: "sichere Muster & bestätigte Regeln (empfohlen)",
                aktiv: true,
              },
              {
                stufe: "Mutig",
                text: "auch gelernte Muster ab 2 Bestätigungen",
                aktiv: false,
              },
            ].map((s) => (
              <label
                key={s.stufe}
                className={
                  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition " +
                  (s.aktiv
                    ? "border-brand-600 bg-brand-50/60"
                    : "border-sand-200 hover:border-sand-300")
                }
              >
                <input
                  type="radio"
                  name="stufe"
                  defaultChecked={s.aktiv}
                  className="h-4 w-4 accent-[var(--color-brand-700)]"
                />
                <span>
                  <span className="block text-[14px] font-semibold text-sand-900">
                    {s.stufe}
                  </span>
                  <span className="block text-[12.5px] text-sand-600">
                    {s.text}
                  </span>
                </span>
              </label>
            ))}
            <p className="pt-1 text-[12px] text-sand-500">
              Jede automatische Buchung bleibt begründet, protokolliert und
              umkehrbar — egal welche Stufe.
            </p>
          </div>
        </Karte>

        <Karte titel="Verbindungen" sub="Was angeschlossen ist">
          <Zeile label="Bank (Sparkasse Aurich-Norden)" wert="verbunden" status="ok" />
          <Zeile label="Bank (VR-Bank, Rücklagen)" wert="verbunden" status="ok" />
          <Zeile label="Beleg-Postfach" wert="aktiv" status="ok" />
          <Zeile
            label="Abrechnung (opta data)"
            wert="Import eingerichtet"
            status="ok"
          />
          <Zeile label="DATEV (Kanzlei Meyer & Kollegen)" wert="verbunden" status="ok" />
        </Karte>

        <Karte titel="Unternehmen" sub="Aus dem Onboarding — jederzeit änderbar">
          <Zeile label="Rechtsform" wert="GmbH" />
          <Zeile label="Kontenrahmen" wert="SKR45 (Gesundheitswesen)" />
          <Zeile label="Umsatzsteuer" wert="§ 4 Nr. 16 — steuerfrei" />
          <Zeile label="Wirtschaftsjahr" wert="Kalenderjahr" />
          <Zeile label="Bank-Sachkonto" wert="1260" />
        </Karte>

        <Karte titel="Kanzlei-Zugang" sub="Ihre Steuerkanzlei arbeitet mit, nicht hinterher">
          <Zeile label="Lesezugriff Buchungen & Protokoll" wert="aktiv" status="ok" />
          <Zeile label="Stapel-Empfang" wert="als Entwurf (empfohlen)" />
          <Zeile label="Monatsbericht per Mail" wert="zum 3. Werktag" />
          <p className="pt-3 text-[12px] leading-relaxed text-sand-500">
            Die Kanzlei sieht dieselben Zahlen wie Sie — inklusive
            Cent-Anker-Protokoll. Keine Rückfragen-Schleifen mehr.
          </p>
        </Karte>
      </div>
    </main>
  );
}
