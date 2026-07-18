/* WICHTIG: Platzhalter 【…】 müssen vor Veröffentlichung von Daniel mit den
   echten Firmendaten gefüllt werden — hier wird bewusst nichts erfunden. */

export const metadata = { title: "Impressum — Kontoklar" };

export default function Impressum() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold text-ink">Impressum</h1>
      <div className="mt-6 space-y-4 text-[14.5px] leading-relaxed text-ink-soft">
        <p className="rounded-2xl bg-tile-apricot p-4 text-[13px] font-semibold text-tile-apricot-ink">
          Entwurf — die mit 【…】 markierten Angaben bitte vor Veröffentlichung
          durch die echten Firmendaten ersetzen.
        </p>
        <p>
          <strong className="text-ink">【Firmenname GmbH】</strong><br />
          【Straße Hausnummer】<br />【PLZ Ort】
        </p>
        <p>
          Vertreten durch: 【Geschäftsführer】<br />
          Handelsregister: 【Amtsgericht, HRB-Nummer】<br />
          USt-IdNr.: 【DE…】
        </p>
        <p>
          Kontakt: 【Telefon】 · <a className="text-brand-700 underline" href="mailto:kontakt@froehlichdienste.de">kontakt@froehlichdienste.de</a>
        </p>
        <p>
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: 【Name, Anschrift】
        </p>
      </div>
    </main>
  );
}
