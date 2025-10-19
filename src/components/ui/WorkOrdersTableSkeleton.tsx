"use client";
import React from "react";

export default function WorkOrdersTableSkeleton({
  rows = 6,
}: {
  rows?: number;
}) {
  return (
    <div className="space-y-6">
      {/* Mobile card skeletons (improved to match ResponsiveShopPipelineCard layout) */}
      <div className="lg:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative rounded-[5px] border border-[#BFC4FF] bg-white px-3 py-3 shadow-sm"
          >
            {/* Header: id placeholder (left) and date (right) */}
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
            </div>

            {/* Client (bold) */}
            <div className="mb-3">
              <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
            </div>

            {/* Vehicle and service lines */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-3 w-full rounded bg-gray-100 animate-pulse mb-2" />
                <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
              </div>

              {/* Status pill placeholder */}
              <div className="ml-4 flex-shrink-0">
                <div className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden lg:block">
        <div className="w-full overflow-hidden rounded border bg-white p-4">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "Work Order#",
                  "Client",
                  "Vehicle Info",
                  "Services",
                  "Time Created",
                  "Due Date",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr
                  key={r}
                  className={r % 2 === 0 ? "bg-background" : "bg-[#DBEAFE]"}
                >
                  <td className="px-4 py-3">
                    <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
