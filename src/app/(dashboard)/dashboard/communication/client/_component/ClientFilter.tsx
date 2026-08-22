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

  // Reset filters on component mount - runs synchronously before paint
  useEffect(() => {
    setSearchTerm("");
    setFilter("All");

    return () => {
      setClear();
    };
  }, [setFilter, setSearchTerm, setClear]);

  const filters = ["All", "Unread", "Starred", "Assigned"] as const;

  return (
    <div className="w-full space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search Client by Name, Email Or Phone"
          className={cn(
            "w-full rounded-md border bg-white pl-9 pr-9 py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none",
            "border-zinc-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
            "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
          )}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          style={{
            WebkitAppearance: "none",
            WebkitTextSizeAdjust: "100%",
            touchAction: "manipulation",
          }}
          aria-label="Search clients"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={setClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Clear search"
            title="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        role="radiogroup"
        aria-label="Filter clients"
        className={cn(
          "flex items-center gap-1 rounded-lg border p-1 text-xs font-medium",
          "border-emerald-600",
          "overflow-x-auto no-scrollbar",
        )}
      >
        {filters.map((item) => {
          const selected = filter === item;
          const label = item === "Assigned" ? "Assigned To Me" : item;
          return (
            <button
              key={item}
              role="radio"
              aria-checked={selected}
              onClick={() => handleFilterChange(item)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                selected
                  ? "bg-gradient-to-r from-teal-700 to-teal-600 text-white"
                  : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20",
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
