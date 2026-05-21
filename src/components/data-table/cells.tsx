import { cn } from "@/lib/cn";
import { ReactNode } from "react";

/* ---------- Status Badge ---------- */
type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<
  StatusTone,
  { bg: string; text: string; dot: string }
> = {
  success: {
    bg: "bg-[#6571FF]/5 dark:bg-[#6571FF]/40",
    text: "text-[#6571FF]/80",
    dot: "bg-[#6571FF]/80",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-500",
    dot: "bg-amber-400",
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-500",
    dot: "bg-red-400",
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-500",
    dot: "bg-sky-400",
  },
  neutral: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  tone,
  label,
  minWidth = true,
}: {
  tone: StatusTone;
  label: ReactNode;
  minWidth?: boolean;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        minWidth && "min-w-20",
        c.bg,
        c.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {label}
    </span>
  );
}

/* ---------- Stock Bar ---------- */
export function StockBar({
  qty,
  alert,
  width = "w-16",
}: {
  qty: number;
  alert: number;
  width?: string;
}) {
  const maxRef = Math.max(qty, (alert || 1) * 10, 50);
  const pct = qty === 0 ? 0 : Math.min((qty / maxRef) * 100, 100);
  const color =
    qty === 0 ? "#EF4444" : qty <= (alert || 0) ? "#F59E0B" : "#6571FF";
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-1.5 rounded-full bg-slate-100 dark:bg-slate-800",
          width,
        )}
      >
        <div
          className="h-full rounded-full opacity-60"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {qty}
      </span>
    </div>
  );
}

/* ---------- Mobile Card Shell ---------- */
export function MobileCard({
  children,
  onClick,
  selected = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950",
        onClick &&
          "cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.98]",
        selected && "ring-2 ring-[#6571FF]/30 border-[#6571FF]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MobileCardField({
  label,
  value,
  fullWidth = false,
}: {
  label: ReactNode;
  value: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(fullWidth ? "" : "min-w-0")}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

/* ---------- Stat Tile ---------- */
/** A polished stat tile for mobile cards with subtle bg, label + bold value */
export function StatTile({
  label,
  value,
  emphasized = false,
  className,
  fullWidth = false,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Brand-accent variant for headline metric */
  emphasized?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-2.5 ring-1 ring-inset",
        emphasized
          ? "bg-[#6571FF]/[0.06] ring-[#6571FF]/15"
          : "bg-slate-50/70 ring-slate-100 dark:bg-slate-900/30 dark:ring-slate-800/60",
        fullWidth && "col-span-full",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-bold",
          emphasized
            ? "text-[#6571FF]/85"
            : "text-slate-500 dark:text-slate-100",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Empty State ---------- */
export function EmptyState({
  title = "No Results Found",
  subtitle = "We couldn't find what you're looking for. Try adjusting your filters or search terms.",
  message,
}: {
  title?: string;
  subtitle?: string;
  /** Backwards-compat shorthand: sets title and skips subtitle */
  message?: string;
}) {
  const heading = message ?? title;
  const sub = message ? undefined : subtitle;
  return (
    <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate-300"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">{heading}</h3>
      {sub && (
        <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
          {sub}
        </p>
      )}
    </div>
  );
}
