"use client";
import React from "react";

type Props = {
  rows?: number;
};

export default function AttendanceTableSkeleton({ rows = 7 }: Props) {
  const cols = [
    "Date",
    "Time Clocked In",
    "Time Clocked Out",
    "Break",
    "Hours",
  ];

  return (
    <div className="w-full overflow-hidden rounded border bg-white p-4">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 text-left font-semibold text-gray-600"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Weekend row with skeleton blocks */}
            <tr className="border-b bg-blue-50">
              <td className="px-4 py-3 font-medium">
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </td>
            </tr>

            {/* Remaining rows as skeletons */}
            {Array.from({ length: rows - 1 }).map((_, i) => {
              const isEven = i % 2 === 0;
              const dayIndex = (i + 1) % 7;
              const dayLabel = [
                "MON",
                "TUE",
                "WED",
                "THU",
                "FRI",
                "SAT",
                "SUN",
              ][dayIndex];
              const dateNum = 20 + i;

              return (
                <tr
                  key={i}
                  className={`border-b ${isEven ? "bg-blue-50" : "bg-white"}`}
                >
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
