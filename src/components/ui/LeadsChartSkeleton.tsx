"use client";
import React from "react";

type Props = {
  variant?: "single" | "stacked";
  bars?: number;
  height?: number;
};

export default function LeadsChartSkeleton({
  variant = "single",
  bars = 6,
  height = 320,
}: Props) {
  const items = Array.from({ length: bars });

  return (
    <div className="w-full rounded-md border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      </div>

      <div style={{ height }} className="flex items-end gap-4 px-2">
        {items.map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            {/* numeric label placeholder */}
            <div className="mb-2 h-5 w-8 rounded-full bg-gray-200 animate-pulse" />

            {/* bar */}
            <div className="w-full flex flex-col justify-end items-center">
              {variant === "stacked" ? (
                <div
                  className="relative w-10 mx-auto flex flex-col items-center"
                  style={{ width: "44px" }}
                >
                  {/* outer tall rounded pill (increased height) */}
                  <div
                    className="bg-gray-300 animate-pulse"
                    style={{
                      // make pill larger: prefer proportional to container height
                      height: Math.max(180, Math.round(height * 0.7)),
                      width: "44px",
                      borderRadius: 9999,
                      display: "block",
                    }}
                  />

                 
                </div>

              ) : (
                <div
                  className="rounded-t-lg bg-gray-300 animate-pulse w-full"
                  style={{ height: Math.max(220, Math.round(height * 0.6)) }}
                />
              )}
            </div>

            {/* month label placeholder */}
            <div className="mt-3 h-3 w-10 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
