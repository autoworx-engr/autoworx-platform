// Shared visual vocabulary for the team board's card and column header.

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

export function shortDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
