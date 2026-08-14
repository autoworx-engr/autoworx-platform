import { format } from "date-fns";
import type { ClickupFilterState, ReportGranularity } from "@/types/clickup";

const GRANULARITIES: ReportGranularity[] = ["day", "week", "month"];

/** Reads filter state from the URL so a shared link reproduces the same view. */
export function parseFiltersFromParams(params: {
  get(key: string): string | null;
}): ClickupFilterState {
  const today = format(new Date(), "yyyy-MM-dd");

  const granularityParam = params.get(
    "granularity",
  ) as ReportGranularity | null;
  const assigneesParam = params.get("assignees");

  return {
    startDate: params.get("startDate") || today,
    endDate: params.get("endDate") || today,
    granularity: GRANULARITIES.includes(granularityParam as ReportGranularity)
      ? (granularityParam as ReportGranularity)
      : "day",
    assignees: assigneesParam
      ? assigneesParam
          .split(",")
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      : [],
  };
}

/** Today only, Day granularity, everyone — the page's baseline view. */
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
