"use client";
import React from "react";
import { BarChart, ResponsiveContainer } from "recharts";

interface TProps {
  height: number | string;
  title: string;
  data: Record<string, unknown>[];
  children?: React.ReactNode;
}

export default function BarChartComponent({
  title,
  height,
  data,
  children,
}: TProps) {
  const isPercent = typeof height === "string" && height.includes("%");

  return (
    <div
      style={{
        width: "100%",
        height: isPercent ? height : "auto",
        display: isPercent ? "flex" : "block",
        flexDirection: "column",
      }}
    >
      <h2
        style={{ marginLeft: "35px", flexShrink: 0 }}
        className="text-2xl font-bold"
      >
        {title}
      </h2>
      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        <ResponsiveContainer width="95%" height={isPercent ? "100%" : height}>
          <BarChart
            data={data}
            margin={{
              top: 55,
              bottom: 5,
            }}
          >
            {children}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
