// Shared visual vocabulary for the team board's card and column header.

const ACCENTS = [
  "bg-sky-50 text-sky-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
  "bg-indigo-50 text-indigo-600",
];

/** Stable per-title accent so a service keeps the same colour across renders */
export function accentFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return ACCENTS[hash % ACCENTS.length];
}

/**
 * Technician.status is a free-text column, so match on the words actually in
 * use and fall back to a neutral chip rather than guessing.
 */
export function statusPillClass(status?: string | null) {
  const value = status?.toLowerCase().trim() ?? "";
  if (!value) return "bg-slate-100 text-slate-500";
  if (value.startsWith("complete") || value === "ready" || value === "done") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (value.includes("progress")) return "bg-blue-100 text-blue-700";
  if (value.includes("schedul")) return "bg-violet-100 text-violet-700";
  if (value.includes("pending") || value.includes("wait")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

export function priorityPillClass(priority?: string | null) {
  if (priority === "High") return "bg-red-50 text-red-700 ring-red-100";
  if (priority === "Medium") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

export function initialsOf(
  firstName?: string | null,
  lastName?: string | null,
) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function shortDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
