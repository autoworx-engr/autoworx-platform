"use client";

import DateRange from "@/app/(dashboard)/dashboard/payments/components/PaymentDateRange";
import { usePaymentFilterStore } from "@/stores/paymentFilter";
import { ArrowRight, PieChart, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import FilterforPayment from "./FilterforPayment";

interface HeaderSearchProps {
  activeTab?: string;
}

export default function HeaderSearch({ activeTab }: HeaderSearchProps) {
  const { setFilter, dateRange } = usePaymentFilterStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear input when tab changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFilter({ search: "" });
  }, [activeTab, setFilter]);

  return (
    <div className="mt-5 flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-2">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:gap-4 lg:w-auto">
        <div className="group relative flex w-full items-center rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 lg:w-[400px] xl:w-[500px] ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/5 focus-within:shadow-md focus-within:shadow-indigo-500/5 hover:ring-slate-300 dark:hover:ring-slate-600">
          <span className="text-slate-400 group-focus-within:text-primary transition-colors duration-300">
            <Search className="w-5 h-5" />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              activeTab === "transactions"
                ? "Search by Invoice ID, Customer, Vehicle..."
                : "Search..."
            }
            className="w-full bg-transparent pl-3 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
        <div className="z-50 flex w-full flex-wrap items-center gap-4 sm:flex-nowrap lg:w-auto">
          <div className="transition-transform hover:scale-[1.01] z-50">
            <DateRange
              dateRange={dateRange}
              onOk={(start, end) => setFilter({ dateRange: [start, end] })}
              onCancel={() => setFilter({ dateRange: [null, null] })}
            />
          </div>
          <div className="transition-transform hover:scale-[1.01]">
            <FilterforPayment />
          </div>
        </div>
      </div>

      <div className="flex shrink-0">
        <Link
          href="/dashboard/reporting/payments?view=payments"
          className="
            group relative flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl
            bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900
            ring-1 ring-slate-200 dark:ring-slate-700
            shadow-[0_1px_2px_rgba(0,0,0,0.05)]
            text-primary font-medium
            transition-all duration-300 ease-out
            hover:shadow-lg hover:shadow-indigo-500/10
            hover:-translate-y-0.5 hover:scale-[1.02]
            hover:ring-indigo-500/30 dark:hover:ring-indigo-400/30
            w-fit
          "
        >
          {/* Icon Container */}
          <div
            className="
              p-1.5 rounded-lg 
              bg-indigo-50 dark:bg-indigo-500/10 
              text-primary
              group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 
              transition-colors duration-300
            "
          >
            <PieChart className="w-5 h-5" />
          </div>

          <span className="font-inter tracking-tight">Payment Reporting</span>

          {/* Animated Arrow Micro-interaction */}
          <ArrowRight
            className="
              w-4 h-4 
              opacity-0 -translate-x-2 
              group-hover:opacity-100 group-hover:translate-x-0 
              transition-all duration-300 ease-out
            "
          />
        </Link>
      </div>
    </div>
  );
}
