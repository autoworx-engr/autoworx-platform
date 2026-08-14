"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  filtersToParams,
  parseFiltersFromParams,
} from "@/lib/clickup/filterParams";
import { buildInsight } from "@/lib/clickup/insight";
import type { ClickupBugSummary, ClickupFilterState } from "@/types/clickup";
import ClickupBacklogChart from "./ClickupBacklogChart";
import ClickupFilterBar from "./ClickupFilterBar";
import ClickupHeader from "./ClickupHeader";
import ClickupLeaderboard from "./ClickupLeaderboard";
import ClickupPriorityBreakdown from "./ClickupPriorityBreakdown";
import ClickupStatTiles from "./ClickupStatTiles";
import ClickupStatusBreakdown from "./ClickupStatusBreakdown";
import ClickupTrendChart from "./ClickupTrendChart";

export default function ClickupReportingClient({
  listConfig,
}: {
  listConfig: {
    spaceId: string;
    spaceName: string;
    listId: string;
    listName: string;
  } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ClickupFilterState>(() =>
    parseFiltersFromParams(searchParams),
  );
  const [summary, setSummary] = useState<ClickupBugSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFilters = (next: ClickupFilterState) => {
    setFilters(next);
    router.replace(`${pathname}?${filtersToParams(next).toString()}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!listConfig) return;
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const url = `/api/clickup/tasks-summary?${filtersToParams(filters).toString()}`;

    fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.message);
        setSummary(data.summary);
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setError("Failed to load ClickUp bug data for this range.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [listConfig, filters]);

  if (!listConfig) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold">
          ClickUp isn&apos;t configured
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set CLICKUP_API_TOKEN, CLICKUP_SPACE_ID, CLICKUP_SPACE_NAME,
          CLICKUP_LIST_ID and CLICKUP_LIST_NAME in the environment to enable
          this page.
        </p>
      </div>
    );
  }

  const insight = summary ? buildInsight(summary) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <ClickupHeader
        listName={listConfig.listName}
        spaceName={listConfig.spaceName}
        insight={insight}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClickupFilterBar
          value={filters}
          onChange={updateFilters}
          assignableUsers={summary?.assignableUsers ?? []}
        />
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {summary && (
        <div
          className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        >
          <ClickupStatTiles summary={summary} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ClickupLeaderboard
              title="Most bugs created"
              countLabel="Created"
              entries={summary.topCreators}
              accentColor="#2a78d6"
            />
            <ClickupLeaderboard
              title="Most bugs completed"
              countLabel="Completed"
              entries={summary.topCompleters}
              accentColor="#0ca30c"
            />
          </div>

          <ClickupTrendChart trend={summary.trend} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ClickupBacklogChart trend={summary.trend} />
            <ClickupStatusBreakdown slices={summary.statusBreakdown} />
          </div>

          <ClickupPriorityBreakdown slices={summary.priorityBreakdown} />
        </div>
      )}

      {!summary && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      )}
    </div>
  );
}
