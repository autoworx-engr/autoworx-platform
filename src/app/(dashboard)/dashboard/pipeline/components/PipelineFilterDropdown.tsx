"use client";

import { cn } from "@/lib/cn";
import { ChevronDown, Funnel, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type FilterOption = { value: string; label: string };

interface PipelineFilterDropdownProps {
  /** Button text and the "clear" row label when nothing is selected */
  allLabel: string;
  options: FilterOption[];
  value: string | null;
  onSelect: (value: string) => void;
  onClear: () => void;
  ariaLabel: string;
  /** Button label for a selection that may not be on a loaded page */
  selectedLabel?: string;
  /** Notifies the owner so it can start/stop fetching pages */
  onOpenChange?: (open: boolean) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export default function PipelineFilterDropdown({
  allLabel,
  options,
  value,
  onSelect,
  onClear,
  ariaLabel,
  selectedLabel,
  onOpenChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  hasMore = false,
  isLoading = false,
  onLoadMore,
}: PipelineFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
    onOpenChangeRef.current = onOpenChange;
  }, [onLoadMore, onOpenChange]);

  const toggleOpen = useCallback((next: boolean) => {
    setOpen(next);
    onOpenChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        toggleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, toggleOpen]);

  // Infinite scroll — watch the sentinel at the bottom of the option list
  useEffect(() => {
    if (!open || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMoreRef.current?.();
      },
      { root: listRef.current, rootMargin: "40px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, options.length]);

  const isActive = value !== null;
  const buttonLabel =
    selectedLabel ??
    options.find((option) => option.value === value)?.label ??
    allLabel;

  const rowClass = (selected: boolean) =>
    cn(
      "flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
      selected ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50",
    );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => toggleOpen(!open)}
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-2xl border-2 px-4 transition-all duration-200 sm:w-auto",
          "text-sm font-semibold outline-none active:scale-95",
          isActive || open
            ? "border-primary/40 bg-primary/5 text-primary ring-4 ring-primary/10"
            : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50",
        )}
        aria-label={ariaLabel}
      >
        <Funnel
          size={16}
          className={isActive ? "text-primary" : "text-slate-400"}
        />
        <span className="max-w-[10rem] truncate">{buttonLabel}</span>
        <ChevronDown size={14} className="ml-1 opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl border border-slate-50 bg-white p-2 shadow-[0_20px_50px_rgba(101,113,255,0.12)] animate-in fade-in zoom-in-95 duration-200">
          {onSearchChange && (
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-100 bg-white pl-8 pr-2 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary/40"
                autoComplete="off"
              />
            </div>
          )}

          <div
            ref={listRef}
            className="flex max-h-64 flex-col gap-1 overflow-y-auto"
          >
            <button
              onClick={() => {
                onClear();
                toggleOpen(false);
              }}
              className={rowClass(!isActive)}
            >
              {allLabel}
            </button>

            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  toggleOpen(false);
                }}
                className={rowClass(option.value === value)}
              >
                {option.label}
              </button>
            ))}

            {!isLoading && options.length === 0 && (
              <p className="px-4 py-2.5 text-sm text-slate-400">No matches</p>
            )}

            {hasMore && <div ref={sentinelRef} className="h-1 shrink-0" />}

            {isLoading && (
              <p className="px-4 py-2.5 text-xs text-slate-400">Loading…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
