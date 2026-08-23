import { AlertTriangle } from "lucide-react";
import { PRIORITY_COLOR } from "@/lib/clickup/palette";
import type { BreakdownSlice } from "@/types/clickup";

const LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
  none: "No priority",
};

export default function ClickupPriorityBreakdown({
  slices,
}: {
  slices: BreakdownSlice[];
}) {
  const max = Math.max(...slices.map((s) => s.count), 1);

  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Open bugs by priority</h2>
      </div>
      {slices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nothing open right now.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {slices.map((slice) => {
            const color = PRIORITY_COLOR[slice.key] ?? PRIORITY_COLOR.none;
            return (
              <div key={slice.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">
                  {LABELS[slice.key] ?? slice.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(slice.count / max) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {slice.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
