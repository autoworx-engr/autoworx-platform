"use client";
import { cn } from "@/lib/cn";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { Search, X } from "lucide-react";
import { useCallback, useEffect } from "react";

export default function ClientFilter() {
  const { filter, setFilter, setSearchTerm, setClear, searchTerm } =
    useDemoClientFilterStore();

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm],
  );

  const handleFilterChange = useCallback(
    (value: string) => {
      setFilter(value);
    },
    [setFilter],
  );

  useEffect(() => {
    setSearchTerm("");
    setFilter("All");
    return () => {
      setClear();
    };
  }, [setFilter, setSearchTerm, setClear]);

  const filters = ["All", "Unread", "Starred", "Assigned"] as const;

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Search clients, messages..."
          className={cn(
            "w-full rounded-lg border bg-zinc-50 pl-9 pr-9 py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none",
            "border-zinc-200 focus:border-[#006D77] focus:bg-white focus:ring-2 focus:ring-[#006D77]/15",
            "dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200",
          )}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          autoComplete="off"
          aria-label="Search clients"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={setClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Filter clients"
        className="flex items-center gap-4 border-b border-zinc-200 text-xs font-medium dark:border-white/10"
      >
        {filters.map((item) => {
          const selected = filter === item;
          const label = item === "Assigned" ? "Assigned" : item;
          return (
            <button
              key={item}
              role="radio"
              aria-checked={selected}
              onClick={() => handleFilterChange(item)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-1 py-2 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006D77]/30",
                selected
                  ? "border-[#006D77] text-[#006D77] dark:text-[#4dd2dc]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
