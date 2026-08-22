import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_COLOR } from "@/lib/clickup/palette";
import {
  formatCompactNumber,
  formatResolutionTime,
  formatSignedPct,
} from "@/lib/clickup/format";
import type { ClickupBugSummary } from "@/types/clickup";
import Sparkline from "./Sparkline";

type DeltaTone = "neutral" | "goodUp" | "goodDown";

function Delta({ pct, tone }: { pct: number | null; tone: DeltaTone }) {
  if (pct === null) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        No prior data
      </span>
    );
  }
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const isGood = tone === "neutral" ? null : tone === "goodUp" ? isUp : !isUp;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : isGood === null
      ? "text-muted-foreground"
      : isGood
        ? "text-emerald-600"
        : "text-amber-600";
  const Icon = isFlat ? ArrowRight : isUp ? ArrowUp : ArrowDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {formatSignedPct(pct)} vs. prior period
    </span>
  );
}

function StatTile({
  label,
  value,
  delta,
  sparkline,
  sparklineColor,
}: {
  label: string;
  value: string;
  delta?: ReactNode;
  sparkline?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 h-4">{delta}</div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-3">
          <Sparkline
            data={sparkline}
            color={sparklineColor ?? STATUS_COLOR.neutral}
          />
        </div>
      )}
    </div>
  );
}

export default function ClickupStatTiles({
  summary,
}: {
  summary: ClickupBugSummary;
}) {
  const createdTrend = summary.trend.map((b) => b.created);
  const completedTrend = summary.trend.map((b) => b.completed);
  const backlogTrend = summary.trend.map((b) => b.backlog);
  const backlogDelta = summary.totalOpen - summary.deltas.openAtStart;
  const backlogPct =
    summary.deltas.openAtStart === 0
      ? backlogDelta === 0
        ? 0
        : null
      : (backlogDelta / summary.deltas.openAtStart) * 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Bugs created"
        value={formatCompactNumber(summary.totalCreated)}
        delta={<Delta pct={summary.deltas.createdPct} tone="neutral" />}
        sparkline={createdTrend}
        sparklineColor="#2a78d6"
      />
      <StatTile
        label="Bugs completed"
        value={formatCompactNumber(summary.totalCompleted)}
        delta={<Delta pct={summary.deltas.completedPct} tone="goodUp" />}
        sparkline={completedTrend}
        sparklineColor={STATUS_COLOR.good}
      />
      <StatTile
        label="Open backlog"
        value={formatCompactNumber(summary.totalOpen)}
        delta={<Delta pct={backlogPct} tone="goodDown" />}
        sparkline={backlogTrend}
        sparklineColor={STATUS_COLOR.warning}
      />
      <StatTile
        label="Avg. time to close"
        value={formatResolutionTime(summary.avgResolutionHours)}
        delta={
          <span className="text-xs text-muted-foreground">
            across {formatCompactNumber(summary.totalCompleted)} closed this
            range
          </span>
        }
      />
    </div>
  );
}
