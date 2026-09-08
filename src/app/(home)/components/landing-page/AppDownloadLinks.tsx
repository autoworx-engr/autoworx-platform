import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/consts";

const badgeClass =
  "group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#26AADF]/60 hover:bg-white/10";

function AppleIcon() {
  return (
    <svg
      viewBox="0 0 384 512"
      aria-hidden="true"
      className="h-7 w-7 shrink-0 fill-white"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className="h-7 w-7 shrink-0">
      <path
        d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z"
        fill="#00A0FF"
      />
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#00F076" />
      <path
        d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8z"
        fill="#FFCE00"
      />
      <path d="M104.6 499l280.8-161.2-60.1-60.1L104.6 499z" fill="#FF3A44" />
    </svg>
  );
}

function StoreBadge({
  href,
  label,
  eyebrow,
  name,
  children,
}: {
  href: string;
  label: string;
  eyebrow: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={badgeClass}
    >
      {children}
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-white/50">
          {eyebrow}
        </span>
        <span className="text-sm font-semibold">{name}</span>
      </span>
    </a>
  );
}

export default function AppDownloadLinks() {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
        Get the App
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Run your shop from anywhere — download Autoworx on iOS and Android.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <StoreBadge
          href={APP_STORE_URL}
          label="Download Autoworx on the App Store"
          eyebrow="Download on the"
          name="App Store"
        >
          <AppleIcon />
        </StoreBadge>
        <StoreBadge
          href={PLAY_STORE_URL}
          label="Get Autoworx on Google Play"
          eyebrow="Get it on"
          name="Google Play"
        >
          <PlayStoreIcon />
        </StoreBadge>
      </div>
    </div>
  );
}
