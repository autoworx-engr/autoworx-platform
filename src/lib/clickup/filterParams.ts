import { format, startOfMonth, startOfWeek } from "date-fns";
import type { ClickupFilterState, ReportGranularity } from "@/types/clickup";

const GRANULARITIES: ReportGranularity[] = ["day", "week", "month"];

/** Sentinel start far before any real ClickUp task — stands in for "since the beginning". */
export const ALL_TIME_START = "2010-01-01";

/** The four quick presets behind the Day/Week/Month/All buttons. */
export function getPresetRange(preset: "day" | "week" | "month" | "all"): {
  startDate: string;
  endDate: string;
  granularity: ReportGranularity;
} {
  const today = format(new Date(), "yyyy-MM-dd");
  if (preset === "day")
    return { startDate: today, endDate: today, granularity: "day" };
  if (preset === "week")
    return {
      startDate: format(startOfWeek(new Date()), "yyyy-MM-dd"),
      endDate: today,
      granularity: "day",
    };
  if (preset === "month")
    return {
      startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate: today,
      granularity: "day",
    };
  return { startDate: ALL_TIME_START, endDate: today, granularity: "month" };
}

export function matchesPresetRange(
  filters: ClickupFilterState,
  preset: "day" | "week" | "month" | "all",
): boolean {
  const range = getPresetRange(preset);
  return (
    filters.startDate === range.startDate &&
    filters.endDate === range.endDate &&
    filters.granularity === range.granularity
  );
}

/** Human-readable label for whatever range is currently selected, for a page heading. */
export function describeFilterRange(filters: ClickupFilterState): string {
  if (matchesPresetRange(filters, "all")) return "All time";

  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  const sameDay = filters.startDate === filters.endDate;

  if (matchesPresetRange(filters, "day"))
    return `Today, ${format(start, "MMM d, yyyy")}`;
  if (matchesPresetRange(filters, "week"))
    return `This week, ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  if (matchesPresetRange(filters, "month"))
    return `This month, ${format(start, "MMMM yyyy")}`;

  if (sameDay) return format(start, "MMM d, yyyy");
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

/** Reads filter state from the URL so a shared link reproduces the same view. */
export function parseFiltersFromParams(params: {
  get(key: string): string | null;
}): ClickupFilterState {
  const defaults = getPresetRange("all");

  const granularityParam = params.get(
    "granularity",
  ) as ReportGranularity | null;
  const assigneesParam = params.get("assignees");

  return {
    startDate: params.get("startDate") || defaults.startDate,
    endDate: params.get("endDate") || defaults.endDate,
    granularity: GRANULARITIES.includes(granularityParam as ReportGranularity)
      ? (granularityParam as ReportGranularity)
      : defaults.granularity,
    assignees: assigneesParam
      ? assigneesParam
          .split(",")
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      : [],
  };
}

/** All-time, Month granularity, everyone — the page's baseline view. */
export function getDefaultFilters(): ClickupFilterState {
  return parseFiltersFromParams(new URLSearchParams());
}

export function isDefaultFilters(filters: ClickupFilterState): boolean {
  const defaults = getDefaultFilters();
  return (
    filters.startDate === defaults.startDate &&
    filters.endDate === defaults.endDate &&
    filters.granularity === defaults.granularity &&
    filters.assignees.length === 0
  );
}

export function filtersToParams(filters: ClickupFilterState): URLSearchParams {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
    granularity: filters.granularity,
  });
  if (filters.assignees.length)
    params.set("assignees", filters.assignees.join(","));
  return params;
}
