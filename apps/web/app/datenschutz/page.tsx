/* Entwurf einer Datenschutzerklärung — Struktur vollständig, die mit 【…】
   markierten Stellen (Verantwortlicher, ggf. DSB) füllt Daniel; vor dem
   ersten zahlenden Kunden juristisch prüfen lassen. */

export const metadata = { title: "Datenschutz — Kontoklar" };

const ABSCHNITTE: { t: string; i: string }[] = [
  { t: "Verantwortlicher", i: "【Firmenname GmbH, Anschrift, E-Mail】. Ein Datenschutzbeauftragter ist 【bestellt: Kontakt / nicht bestellt】." },
  { t: "Welche Daten wir verarbeiten", i: "Konto- und Anmeldedaten (E-Mail, Name, Passwort-Hash), Buchhaltungsdaten Ihres Unternehmens (Bankumsätze, Buchungen, Belege, Rechnungen), Personalbogen-Daten Ihrer Beschäftigten (nur in Ihrem Auftrag) sowie technische Protokolle (Audit-Log Ihrer Aktionen)." },
  { t: "Zwecke und Rechtsgrundlagen", i: "Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für alle Kernfunktionen; gesetzliche Aufbewahrungspflichten (lit. c, GoBD/AO); berechtigtes Interesse (lit. f) für Betriebssicherheit und Missbrauchsabwehr. Personalbogen-Daten verarbeiten wir als Auftragsverarbeiter Ihres Unternehmens (Art. 28 DSGVO — AV-Vertrag auf Anfrage)." },
  { t: "Hosting", i: "Server in Deutschland (Hetzner Online GmbH, Falkenstein). Übertragung ausschließlich TLS-verschlüsselt; Sitzungen über httpOnly-Cookies." },
  { t: "Empfänger", i: "Eine Weitergabe erfolgt nur auf Ihre Veranlassung: DATEV-Export an Ihre Steuerkanzlei, E-Rechnungen an Ihre Kunden. Keine Werbe-Tracker, keine Analyse-Dienste Dritter." },
  { t: "Speicherdauer", i: "Buchhaltungsdaten gemäß gesetzlicher Aufbewahrung (bis 10 Jahre); Konto- und Personaldaten bis zur Löschung durch Sie bzw. Vertragsende zzgl. gesetzlicher Fristen." },
  { t: "Ihre Rechte", i: "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei einer Aufsichtsbehörde. Wenden Sie sich an 【E-Mail】." },
];

export default function Datenschutz() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-3xl font-semibold text-ink">Datenschutzerklärung</h1>
      <p className="mt-4 rounded-2xl bg-tile-apricot p-4 text-[13px] font-semibold text-tile-apricot-ink">
        Entwurf — 【…】-Stellen ausfüllen und vor dem ersten zahlenden Kunden
        juristisch prüfen lassen.
      </p>
      <div className="mt-6 space-y-5">
        {ABSCHNITTE.map((a) => (
          <section key={a.t}>
            <h2 className="text-[15px] font-bold text-ink">{a.t}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{a.i}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
