import React from "react";
import {
  GiftCardPurchaseSummary,
  GiftCardStatusFilter,
  STATUS_FILTERS,
  filterButtonClasses,
} from "./types";

interface GiftCardStatusTabsProps {
  status: GiftCardStatusFilter;
  summary: GiftCardPurchaseSummary;
  onStatusChange: (status: GiftCardStatusFilter) => void;
}

export function GiftCardStatusTabs({
  status,
  summary,
  onStatusChange,
}: GiftCardStatusTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((f) => {
        const isActive = status === f;
        const count =
          f === "ALL"
            ? summary.totalIssued
            : (summary.statusBreakdown[
                f as keyof typeof summary.statusBreakdown
              ] ?? 0);
        return (
          <button
            key={f}
            onClick={() => onStatusChange(f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${filterButtonClasses(f, isActive)}`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
            <span
              className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
