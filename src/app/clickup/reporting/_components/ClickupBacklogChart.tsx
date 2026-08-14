"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_COLOR } from "@/lib/clickup/palette";
import type { TrendBucket } from "@/types/clickup";

function BacklogTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-3 text-sm shadow-lg dark:bg-slate-900">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums">{payload[0].value}</span>
        <span className="text-muted-foreground">open bugs</span>
      </div>
    </div>
  );
}

export default function ClickupBacklogChart({
  trend,
}: {
  trend: TrendBucket[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="text-base font-semibold">Backlog over time</h2>
      <p className="text-sm text-muted-foreground">
        Total open bugs at the end of each bucket — growing means intake is
        outpacing triage.
      </p>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trend}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="backlogFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={STATUS_COLOR.warning}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={STATUS_COLOR.warning}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              stroke="#6b7280"
            />
            <YAxis
              allowDecimals={false}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#6b7280"
            />
            <Tooltip content={<BacklogTooltip />} />
            <Area
              type="monotone"
              dataKey="backlog"
              stroke={STATUS_COLOR.warning}
              strokeWidth={2}
              fill="url(#backlogFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
