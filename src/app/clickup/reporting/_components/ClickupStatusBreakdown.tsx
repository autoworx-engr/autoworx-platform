"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { categoricalColor, STATUS_COLOR } from "@/lib/clickup/palette";
import type { BreakdownSlice } from "@/types/clickup";

export default function ClickupStatusBreakdown({
  slices,
}: {
  slices: BreakdownSlice[];
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="text-base font-semibold">Open bugs by status</h2>
      <p className="text-sm text-muted-foreground">
        Where the {total} open bugs currently sit.
      </p>
      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nothing open right now.
        </p>
      ) : (
        <div className="mt-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.key}
                    fill={
                      slice.key === "other"
                        ? STATUS_COLOR.neutral
                        : categoricalColor(index)
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
