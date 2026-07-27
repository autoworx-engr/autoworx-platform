"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/hooks/useGlobalSearch";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function GlobalSearch({
  iconClassName,
}: {
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { query, setQuery, results, hasResults, isSearching } = useSearch();
  const router = useRouter();
  console.log("results", results?.length);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastInteraction, setLastInteraction] = useState<"mouse" | "keyboard">(
    "keyboard",
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setLastInteraction("keyboard");
    }
  }, [open]);

  useEffect(() => {
    if (open && results.length > 0 && lastInteraction === "keyboard") {
      const container = containerRef.current;
      const activeEl = container?.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, open, results, lastInteraction]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQuery("");
    }
  };

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const handleMouseEnter = (index: number) => {
    setLastInteraction("mouse");
    setSelectedIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasResults) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLastInteraction("keyboard");
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLastInteraction("keyboard");
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].href);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="px-2 outline-none" title="Search">
          <Search
            className={iconClassName || "size-5 sm:size-7 text-primary"}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%] w-[95vw] sm:w-full sm:max-w-[600px] rounded-2xl sm:rounded-lg gap-0 p-0 overflow-hidden shadow-2xl">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for pages, settings, and forms
        </DialogDescription>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              setLastInteraction("keyboard");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none border-none placeholder:text-muted-foreground focus-visible:ring-0 shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div
          ref={containerRef}
          className="max-h-[350px] overflow-y-auto overflow-x-hidden p-2"
        >
          {isSearching && !hasResults && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
          {hasResults && (
            <div className="flex flex-col gap-1">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  data-index={index}
                  onClick={() => handleSelect(result.href)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  className={`relative flex cursor-pointer select-none items-center justify-between rounded-sm px-3 py-2 outline-none transition-colors text-left w-full ${
                    index === selectedIndex
                      ? "bg-slate-100 dark:bg-slate-800"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {result.label}
                    </span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {result.description}
                      </span>
                    )}
                  </div>
                  {result.type && (
                    <span className="ml-3 shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {result.type}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
