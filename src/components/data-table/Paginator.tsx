"use client";

import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export type PaginatorProps = {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, size?: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function Paginator({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginatorProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = getPageRange(current, totalPages);
  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#6571FF] hover:text-[#6571FF] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        className={btn}
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-1 text-xs text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors",
              p === current
                ? "bg-[#6571FF] text-white shadow-sm shadow-[#6571FF]/30"
                : "border border-slate-200 text-slate-600 hover:border-[#6571FF] hover:text-[#6571FF] dark:border-slate-700 dark:text-slate-300",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={btn}
        onClick={() => onChange(current + 1)}
        disabled={current >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
      <select
        value={pageSize}
        onChange={(e) => onChange(1, Number(e.target.value))}
        className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#6571FF] focus:outline-none focus:ring-1 focus:ring-[#6571FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {pageSizeOptions.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </div>
  );
}
