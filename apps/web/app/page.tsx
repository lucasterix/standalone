import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LogoMark } from "@/components/logo";

/* ============================================================
   Landing — Fokus Pflege/Sozialwirtschaft.
   Ton: warm & präzise. Alle Zahlen stammen aus dem echten
   Eigenbetrieb (Fröhlich/SSR) — keine erfundenen Testimonials.
   ============================================================ */

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <LogoMark className="h-3.5 w-3.5" />
      <span
        className={`font-display text-xl font-semibold ${dark ? "text-sand-50" : "text-sand-900"}`}
      >
        {BRAND.name}
      </span>
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-bento-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label={`${BRAND.name} — Start`}>
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-sand-700 md:flex">
          <a href="#funktion" className="hover:text-sand-900">
            So funktioniert&rsquo;s
          </a>
          <a href="#pflege" className="hover:text-sand-900">
            Für die Pflege
          </a>
          <a href="#beweis" className="hover:text-sand-900">
            Der Cent-Anker
          </a>
          <a href="#kanzlei" className="hover:text-sand-900">
            Für Kanzleien
          </a>
          <Link
            href="/demo"
            className="knopf knopf-kontur px-4 py-1.5 text-sand-800"
          >
            Produkt ansehen
          </Link>
          <Link href="/login" className="hover:text-sand-900">
            Anmelden
          </Link>
          <a
            href="#pilot"
            className="knopf knopf-primaer px-5 py-2 shadow-sm"
          >
            Pilotkunde werden
          </a>
        </nav>
      </div>
    </header>
  );
}

/* Das ikonische Hero-Visual: der Monats-Saldenabgleich als Karte. */
function HeroProofCard() {
  const monate = [
    { m: "Jan", tx: 511, ok: true },
    { m: "Feb", tx: 603, ok: true },
    { m: "Mär", tx: 640, ok: true },
    { m: "Apr", tx: 621, ok: true },
    { m: "Mai", tx: 549, ok: true },
    { m: "Jun", tx: 737, ok: true },
  ];
  return (
    <div className="relative">
      <div className="tile p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
              Saldenabgleich · Wirtschaftsjahr
            </p>
            <p className="mt-0.5 font-display text-lg font-semibold text-sand-900">
              Pflegedienst Sonnenweg
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-good-bg px-3 py-1 text-xs font-semibold text-status-good">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2.5 6.5l2.4 2.4L9.7 3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cent-genau bewiesen
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {monate.map((x) => (
            <div
              key={x.m}
              className="rounded-2xl bg-tile-mint/70 px-2 py-2.5 text-center"
            >
              <p className="text-[11px] font-semibold text-sand-600">{x.m}</p>
              <p className="tnum mt-0.5 text-[13px] font-semibold text-sand-900">
                {x.tx}
              </p>
              <p className="text-[10px] text-sand-500">Umsätze</p>
              <p className="mt-1 text-[11px] font-bold text-status-good">
                ✓ 0,00&nbsp;€
              </p>
            </div>
          ))}
        </div>

        <div className="zeile-soft mt-5 flex items-center justify-between px-4 py-3">
          <p className="text-[13px] text-sand-700">
            Differenz Bank&nbsp;↔&nbsp;Buchhaltung, Jan–Jun
          </p>
          <p className="tnum font-display text-xl font-bold text-brand-700">
            0,00&nbsp;€
          </p>
        </div>
      </div>

      {/* Schwebende Autopilot-Karte */}
      <div className="absolute -bottom-7 -left-4 hidden rounded-2xl bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
          Autopilot · diese Woche
        </p>
        <p className="mt-0.5 text-sm text-sand-800">
          <span className="tnum font-bold text-brand-700">214</span> Buchungen
          erledigt ·{" "}
          <span className="tnum font-bold text-sand-900">6</span> für Sie zur
          Prüfung
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div className="rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-800">
            Für ambulante Pflegedienste &amp; Sozialwirtschaft
          </p>
          <h1 className="font-display mt-5 text-[2.6rem] font-semibold leading-[1.08] text-sand-900 sm:text-[3.4rem]">
            Buchhaltung, die sich selbst erledigt.
            <br />
            <span className="text-brand-700">Und es beweist.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-700">
            {BRAND.name} liest Ihre Bankumsätze, kennt Pflegekassen, Sammelavise
            und SKR45 — und kontiert von selbst. Was sicher ist, wird gebucht.
            Was nicht, fragt kurz nach. Am Monatsende steht der DATEV-Stapel für
            Ihre Steuerkanzlei bereit — <em>Cent-genau, mit Beweis.</em>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <a
              href="#pilot"
              className="knopf knopf-primaer px-6 py-3 text-[15px] shadow-md shadow-brand-700/20"
            >
              Pilotkunde werden
            </a>
            <Link
              href="/demo"
              className="knopf knopf-hell px-6 py-3 text-[15px]"
            >
              Produkt ansehen →
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-sand-500">
            Entstanden im eigenen Pflegebetrieb — im Echtbetrieb an über
            23.000&nbsp;Banktransaktionen bewiesen.
          </p>
        </div>
        <div className="rise" style={{ animationDelay: "120ms" }}>
          <HeroProofCard />
        </div>
      </div>
    </section>
  );
}

function ProofBand() {
  const stats = [
    {
      wert: "0,00 €",
      label: "Abweichung Bank ↔ Buchhaltung",
      sub: "monatlich Cent-genau nachgewiesen",
    },
    {
      wert: "73 %",
      label: "weniger Prüfaufwand",
      sub: "11.856 → 3.147 offene Posten im Eigenbetrieb",
    },
    {
      wert: "8.717",
      label: "Buchungen automatisch",
      sub: "jede davon nachvollziehbar & umkehrbar",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5">
      <div className="tile tile-mint grid gap-10 p-8 sm:grid-cols-3 sm:p-10">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <p className="tnum zahl-hero text-4xl text-tile-mint-deep">
              {s.wert}
            </p>
            <p className="mt-1.5 font-semibold text-ink">{s.label}</p>
            <p className="mt-0.5 text-sm text-tile-mint-ink">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Funktion() {
  const schritte = [
    {
      nr: "1",
      titel: "Bank verbinden",
      text:
        "Konten koppeln, zehn Fragen beantworten — Kontenrahmen (SKR45), " +
        "Kostenträger und Personenkonten richtet " +
        `${BRAND.name} aus Ihren Umsätzen selbst ein.`,
    },
    {
      nr: "2",
      titel: "Der Autopilot lernt & bucht",
      text:
        "Gehälter, Beiträge, Kassenzahlungen, Tanken, Miete: wiederkehrendes " +
        "wird erkannt und sicher verbucht. Nur echte Entscheidungen landen " +
        "bei Ihnen — und jede Antwort macht das System schlauer.",
    },
    {
      nr: "3",
      titel: "DATEV-Stapel für die Kanzlei",
      text:
        "Ist der Monat Cent-genau, entsteht der Buchungsstapel — als " +
        "prüfbarer Entwurf direkt in DATEV oder als Import-Datei. Ihre " +
        "Steuerkanzlei behält das letzte Wort.",
    },
  ];
  return (
    <section id="funktion" className="mx-auto max-w-6xl px-5 py-24">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold text-sand-900 sm:text-4xl">
          Drei Schritte. Kein Buchhaltungs-Studium.
        </h2>
        <p className="mt-3 text-lg text-sand-700">
          Sie führen einen Pflegedienst — nicht ein Rechnungswesen. Genau so
          fühlt es sich an.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {schritte.map((s) => (
          <div
            key={s.nr}
            className="tile p-7"
          >
            <span className="tnum inline-flex h-10 w-10 items-center justify-center rounded-full bg-tile-mint font-display text-lg font-bold text-tile-mint-ink">
              {s.nr}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-sand-900">
              {s.titel}
            </h3>
            <p className="mt-2 leading-relaxed text-sand-700">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link
          href="/onboarding"
          className="knopf knopf-hell inline-flex items-center gap-2 px-5 py-3 text-[14px]"
        >
          Den Start selbst ausprobieren →
        </Link>
      </div>
    </section>
  );
}

/* Sammelavis-Visual: EINE Kassenzahlung → viele Klienten-Forderungen. */
function AvisVisual() {
  const posten = [
    { name: "M. Brandt · PG 3", betrag: "412,80" },
    { name: "H. Yildiz · PG 2", betrag: "689,00" },
    { name: "K. Sommer · § 45b", betrag: "125,00" },
    { name: "…9 weitere", betrag: "3.585,53" },
  ];
  return (
    <div className="tile p-6">
      <div className="flex items-center justify-between rounded-2xl bg-tile-mint px-4 py-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">
            Zahlungseingang · Bank
          </p>
          <p className="mt-0.5 font-semibold text-sand-900">
            AOK — Pflegekasse (Sammelavis)
          </p>
        </div>
        <p className="tnum font-display text-xl font-bold text-brand-700">
          4.812,33&nbsp;€
        </p>
      </div>
      <div className="my-3 flex justify-center" aria-hidden>
        <svg width="18" height="26" viewBox="0 0 18 26">
          <path
            d="M9 2v18M3.5 15L9 20.5 14.5 15"
            fill="none"
            stroke="var(--color-brand-400)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <ul className="space-y-1.5">
        {posten.map((p) => (
          <li
            key={p.name}
            className="zeile-soft flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <span className="text-sand-700">{p.name}</span>
            <span className="tnum flex items-center gap-2 font-semibold text-sand-900">
              {p.betrag}&nbsp;€
              <span className="text-status-good" aria-label="zugeordnet">
                ✓
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3.5 text-center text-[13px] text-sand-500">
        12 offene Forderungen automatisch ausgeglichen — Rest:{" "}
        <span className="tnum font-semibold text-status-good">0,00&nbsp;€</span>
      </p>
    </div>
  );
}

function Pflege() {
  const punkte = [
    {
      titel: "Sammelavise, entwirrt",
      text: "Eine Kassenzahlung, dutzende Klienten: der Zahlungseingang wird automatisch auf die offenen Forderungen verteilt — pro Kostenträger, pro Person.",
    },
    {
      titel: "SKR45 ab Werk",
      text: "Pflegegrade × Kostenträger, Behandlungspflege SGB V, AAG-Erstattungen: der Gesundheitswesen-Kontenrahmen ist vorkonfiguriert, nicht nachgerüstet.",
    },
    {
      titel: "Umsatzsteuer? Richtig keine.",
      text: "Pflegeleistungen sind nach § 4 Nr. 16 UStG steuerfrei — gebucht wird brutto, ohne falsche Vorsteuer. Generische Tools machen genau das falsch.",
    },
    {
      titel: "Gehälter & Beiträge im Griff",
      text: "Lohnläufe, SV-Beiträge an die Einzugsstellen, Berufsgenossenschaft: die monatliche Massenbuchung läuft als Muster — ohne einen einzigen Klick.",
    },
  ];
  return (
    <section id="pflege" className="py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand-700">
            Gebaut für die Pflege
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-sand-900 sm:text-4xl">
            Ihre Branche ist kein Sonderfall.
            <br />
            Sie ist unser Normalfall.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-sand-700">
            {BRAND.name} kommt selbst aus einem ambulanten Pflegedienst. Die
            Eigenheiten, an denen generische Buchhaltungs-Tools scheitern, sind
            hier der Kern des Produkts.
          </p>
          <dl className="mt-9 grid gap-6 sm:grid-cols-2">
            {punkte.map((p) => (
              <div key={p.titel}>
                <dt className="flex items-center gap-2 font-semibold text-sand-900">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full bg-brand-600"
                  />
                  {p.titel}
                </dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-sand-700">
                  {p.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <AvisVisual />
      </div>
    </section>
  );
}

function CentAnker() {
  return (
    <section id="beweis" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div className="order-2 lg:order-1">
          <div className="tile tile-mint p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-tile-mint-ink">
              Juni · Prüfprotokoll
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/70 pb-3">
                <span className="text-sm text-tile-mint-ink">
                  Umsätze laut Bank
                </span>
                <span className="tnum font-semibold text-ink">
                  737 · 18.114,56&nbsp;€
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/70 pb-3">
                <span className="text-sm text-tile-mint-ink">
                  Davon verbucht
                </span>
                <span className="tnum font-semibold text-ink">
                  737 · 18.114,56&nbsp;€
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/70 pb-3">
                <span className="text-sm text-tile-mint-ink">Doppelt gebucht</span>
                <span className="tnum font-semibold text-ink">0</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-status-good">
                  <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden>
                    <path
                      d="M2.5 6.5l2.4 2.4L9.7 3.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Differenz
                </span>
                <span className="tnum font-display text-lg font-bold text-status-good">
                  0,00&nbsp;€
                </span>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-tile-mint-ink">
              Weicht auch nur ein Cent ab, sehen Sie sofort wo — bevor es Ihre
              Kanzlei oder die Betriebsprüfung tut.
            </p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-700">
            Der Cent-Anker
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-sand-900 sm:text-4xl">
            Andere versprechen Automatik.
            <br />
            Wir beweisen Korrektheit.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-sand-700">
            Jeden Monat gleicht {BRAND.name} Anzahl <em>und</em> Summe aller
            Bankumsätze gegen die Buchhaltung ab — auf den Cent, mit
            Doppelbuchungs-Detektor. Erst wenn der Monat grün ist, geht der
            Stapel an DATEV. Das ist keine Statistik, sondern ein
            Prüfprotokoll.
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-sand-700">
            Und der Autopilot bleibt ehrlich: Er bucht nur, was er sicher
            begründen kann — alles andere fragt er. Jede automatische Buchung
            trägt ihre Begründung und lässt sich mit einem Klick zurückholen.
          </p>
        </div>
      </div>
    </section>
  );
}

function Kanzlei() {
  const punkte = [
    {
      titel: "Fertige Buchungsstapel statt Schuhkarton",
      text: "Ihre Mandanten liefern keine Belegberge mehr, sondern vorkontierte, Cent-geprüfte Monatsstapel — als Entwurf in DATEV Rechnungswesen oder als Import.",
    },
    {
      titel: "Sie behalten das letzte Wort",
      text: "Nichts wird festgeschrieben. Der Stapel kommt als prüfbarer Entwurf — Ihre Kanzlei bleibt fachlich verantwortlich und wirtschaftlich im Mandat.",
    },
    {
      titel: "Pflege-Mandate ohne Spezialwissen-Engpass",
      text: "SKR45, Kostenträger, § 4 Nr. 16 — das System bringt das Branchenwissen mit, das am Arbeitsmarkt kaum noch zu bekommen ist.",
    },
  ];
  return (
    <section id="kanzlei" className="mx-auto max-w-6xl px-5 py-12">
      <div className="tile tile-rose p-8 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-wider text-tile-rose-ink">
          Für Steuerkanzleien
        </p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
          Mehr Mandate schaffen — mit dem Personal, das Sie haben.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-tile-rose-ink">
          Drei von vier Kanzleien finden keine Steuerfachangestellten mehr.
          {" "}{BRAND.name} übernimmt die vorbereitende Buchhaltung Ihrer
          Pflege-Mandanten — Sie prüfen, statt zu tippen.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {punkte.map((p) => (
            <div
              key={p.titel}
              className="rounded-[28px] bg-white/70 p-7"
            >
              <h3 className="font-semibold text-ink">{p.titel}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-9">
          <Link
            href="/kanzlei"
            className="knopf inline-flex items-center gap-2 bg-tile-rose-ink px-6 py-3 text-[15px] text-white hover:opacity-90"
          >
            Kanzlei-Cockpit ansehen →
          </Link>
        </div>
      </div>
    </section>
  );
}

function PilotCta() {
  return (
    <section id="pilot" className="mx-auto max-w-6xl px-5 py-24">
      <div className="tile-hero relative overflow-hidden px-7 py-14 text-center sm:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <p className="text-[12px] font-semibold uppercase tracking-wider text-teal-100">
          Pilotprogramm 2026
        </p>
        <h2 className="font-display mx-auto mt-3 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Wir suchen fünf Pflegedienste, die ihre Buchhaltung abgeben wollen.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-teal-50">
          Sie bringen Ihre Bankumsätze mit. Wir richten alles gemeinsam ein,
          Sie zahlen in der Pilotphase nichts — und behalten am Ende eine
          Buchhaltung, die sich selbst erledigt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="mailto:pilot@kontoklar.example?subject=Pilotprogramm"
            className="knopf knopf-hell px-7 py-3 text-[15px]"
          >
            Pilot-Platz anfragen
          </a>
          <Link
            href="/demo"
            className="knopf border-[1.5px] border-white/50 px-7 py-3 text-[15px] text-white transition hover:border-white"
          >
            Erst das Produkt ansehen
          </Link>
        </div>
        <p className="mt-6 text-[13px] text-teal-100/90">
          Ehrlich gesagt: {BRAND.name} ist jung. Genau deshalb bekommen
          Pilotkunden Konditionen und Einfluss, die es später nicht mehr gibt.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-sand-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-sand-600 sm:flex-row">
        <Wordmark />
        <p>{BRAND.claim}</p>
        <div className="flex gap-5">
          <a href="/impressum/" className="hover:text-sand-900">
            Impressum
          </a>
          <a href="/datenschutz/" className="hover:text-sand-900">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <main className="bg-bento-bg">
      <Nav />
      <Hero />
      <ProofBand />
      <Funktion />
      <Pflege />
      <CentAnker />
      <Kanzlei />
      <PilotCta />
      <Footer />
    </main>
  );
}
