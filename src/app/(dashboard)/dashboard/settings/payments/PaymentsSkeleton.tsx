"use client";
import React from "react";

export default function PaymentsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-5 space-y-4">
      <div>
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="mt-2 h-3 w-72 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="px-4 py-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
              >
                <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-48 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-5 w-9 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
            <div className="flex flex-col items-center px-4 py-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-3 bg-gray-200 animate-pulse" />
                <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-56 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="h-9 w-40 rounded-lg bg-gray-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
