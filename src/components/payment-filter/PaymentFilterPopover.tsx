"use client";

import { cn } from "@/lib/cn";
import { Filter, Zap } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";

export type PaymentFilterPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: readonly string[];
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  onApply: () => void;
  onClear: () => void;
  /** Extra sections rendered between the method chips and the footer. */
  children?: ReactNode;
  /** Positioning of the popover panel, overridable per call site. */
  panelClassName?: string;
  triggerClassName?: string;
};

const ALL = "All";

export default function PaymentFilterPopover({
  open,
  onOpenChange,
  methods,
  selectedMethod,
  onMethodChange,
  onApply,
  onClear,
  children,
  panelClassName,
  triggerClassName,
}: PaymentFilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isActive = selectedMethod !== ALL;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div className="relative w-full md:w-auto" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title="Open Payment Filters"
        className={cn(
          "flex h-10 min-w-[120px] items-center justify-center rounded-xl px-4 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:shadow-lg",
          isActive
            ? "bg-primary text-white shadow-primary/50"
            : "bg-white ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600",
          triggerClassName,
        )}
      >
        {isActive ? (
          <Zap size={16} className="mr-1 fill-white" />
        ) : (
          <Filter size={16} className="mr-1" />
        )}
        {isActive ? selectedMethod : "Filter"}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-40 mt-2 origin-top-right animate-in fade-in zoom-in-95 duration-200",
            panelClassName,
          )}
        >
          <div className="mt-2 max-h-[70vh] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-slate-900/50 sm:w-72 lg:w-[400px]">
            <div className="mb-6">
              <div className="font-Inter mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Payment Method
              </div>
              <div className="flex flex-wrap gap-2">
                {methods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onMethodChange(method)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-3 py-1 text-base font-medium transition-all duration-200 hover:scale-105",
                      selectedMethod === method
                        ? "border-transparent bg-primary text-white shadow-md"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {children}

            <div className="flex space-x-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onApply}
                className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
