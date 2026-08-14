"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_COLOR } from "@/lib/clickup/palette";
import type { TrendBucket } from "@/types/clickup";

const CREATED_COLOR = "#2a78d6";
const COMPLETED_COLOR = STATUS_COLOR.good;

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-3 text-sm shadow-lg dark:bg-slate-900">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-0.5 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-semibold tabular-nums">{entry.value}</span>
          <span className="text-muted-foreground">{entry.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function ClickupTrendChart({ trend }: { trend: TrendBucket[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="text-base font-semibold">Created vs. completed</h2>
      <p className="text-sm text-muted-foreground">
        How fast bugs come in against how fast they get closed, per bucket.
      </p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={trend}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
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
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            />
            <Bar
              dataKey="created"
              name="Created"
              fill={CREATED_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill={COMPLETED_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
