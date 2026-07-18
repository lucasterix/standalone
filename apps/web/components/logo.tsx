/* Kontoklar-Logomark „Bento": eine asymmetrische Bento-Box aus vier
   runden Kacheln — das Produktprinzip (viele Teile, ein geordnetes
   Ganzes) als Zeichen. Petrol trägt die Marke, eine warme Kachel
   (Apricot) bringt die Bento-Freundlichkeit. Eine Quelle für alle
   Größen; das Favicon (app/icon.svg) ist dieselbe Geometrie. */

export function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect x="1.5" y="1.5" width="17.5" height="13" rx="5.5" fill="#0f766e" />
      <rect x="21.5" y="1.5" width="9" height="13" rx="4.5" fill="#2dd4bf" />
      <rect x="1.5" y="17" width="9" height="13.5" rx="4.5" fill="#f0a95c" />
      <rect x="13" y="17" width="17.5" height="13.5" rx="5.5" fill="#0d9488" />
    </svg>
  );
}

export function Logo({
  markKlasse = "h-[18px] w-[18px]",
  textKlasse = "text-lg",
}: {
  markKlasse?: string;
  textKlasse?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={markKlasse} />
      <span className={`font-display font-semibold text-ink ${textKlasse}`}>
        Kontoklar
      </span>
    </span>
  );
}
