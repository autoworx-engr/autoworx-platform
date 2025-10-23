"use client";
import React from "react";

export default function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-md bg-white p-2 shadow-sm"
        >
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
            <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
