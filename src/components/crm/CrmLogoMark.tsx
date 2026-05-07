import Image from "next/image";

/**
 * Luminar logo image.
 *
 * Pass `height` to fix the rendered height (width scales proportionally via CSS).
 * Pass `width` to fix the rendered width (height scales proportionally).
 * Both default to displaying nicely at the given dimension.
 */
export function LuminarLogo({
  /** Rendered width in px */
  width,
  /** Rendered height in px — if set, width is derived to preserve aspect ratio */
  height,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  // Source image is 400×400 — if only height given, derive width
  const w = width ?? (height ?? 80);
  const h = height ?? w;

  return (
    <Image
      src="/icons/luminar-logo.png"
      alt="Luminar CRM"
      width={w}
      height={h}
      priority
      style={{ width: w, height: h, objectFit: "contain" }}
      className={`rounded-xl ${className}`}
    />
  );
}

/** @deprecated Use LuminarLogo instead */
export const LuminarLogoCompact = LuminarLogo;

/**
 * Legacy inline SVG logomark — kept as fallback / favicon source.
 * @internal
 */
export function CrmLogoMark({
  size = 36,
  rounded = true,
  className = "",
}: {
  size?: number;
  rounded?: boolean;
  className?: string;
}) {
  const r = rounded ? Math.round(size * 0.25) : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Luminar CRM logo"
    >
      <defs>
        <linearGradient id="lcrm-bg" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#059669" />
          <stop offset="55%"  stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="lcrm-line" x1="7" y1="27" x2="29" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
        </linearGradient>
        <filter id="lcrm-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="36" height="36" rx={r} fill="url(#lcrm-bg)" />
      <rect x="0.5" y="0.5" width="35" height="14" rx={r} fill="white" fillOpacity="0.08" />
      <polyline
        points="7,27  14,20  21,14  29,8"
        stroke="url(#lcrm-line)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lcrm-glow)"
      />
      <circle cx="7"  cy="27" r="2.2" fill="white" fillOpacity="0.35" />
      <circle cx="7"  cy="27" r="1.4" fill="white" />
      <circle cx="14" cy="20" r="2.2" fill="white" fillOpacity="0.35" />
      <circle cx="14" cy="20" r="1.4" fill="white" />
      <circle cx="21" cy="14" r="2.2" fill="white" fillOpacity="0.35" />
      <circle cx="21" cy="14" r="1.4" fill="white" />
      <circle cx="29" cy="8"  r="2.8" fill="white" fillOpacity="0.25" />
      <circle cx="29" cy="8"  r="1.8" fill="white" />
      <g filter="url(#lcrm-glow)">
        <line x1="29" y1="3.5" x2="29" y2="1.5"  stroke="white" strokeWidth="1"   strokeLinecap="round" opacity="0.75" />
        <line x1="32" y1="5"   x2="33.5" y2="3.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
        <line x1="33.5" y1="8" x2="35"   y2="8"   stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
      </g>
    </svg>
  );
}

/** Full wordmark block: logo + name, used in auth pages */
export function CrmWordmark({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <LuminarLogo width={size * 1.5} />
    </div>
  );
}
