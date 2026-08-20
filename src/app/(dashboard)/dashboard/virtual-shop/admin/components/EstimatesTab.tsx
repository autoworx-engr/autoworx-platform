"use client";

import FilterByDateRange from "@/app/(dashboard)/dashboard/reporting/components/filter/FilterByDateRange";
import { Pagination } from "antd";
import {
  AlertCircle,
  CheckCircle2,
  Receipt,
  Search,
  XCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import EstimateCard from "./EstimateCard";
import type { Estimate, FilterStatus } from "./EstimatesTab.types";

const STATUSES: FilterStatus[] = [
  "all",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
];

export type EstimatesTabProps = {
  estimates: Estimate[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  search: string;
  status: FilterStatus;
  startDate?: string;
  endDate?: string;
  statusCounts: {
    all: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
};

export default function EstimatesTab({
  estimates,
  totalRecords,
  currentPage,
  pageSize,
  search,
  status,
  startDate,
  endDate,
  statusCounts,
}: EstimatesTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);

  const [activeModal, setActiveModal] = useState<Record<string, boolean>>({
    dateRange: false,
  });

  const totalRevenue = estimates.reduce((sum, e) => sum + e.total, 0);

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(patch).forEach(([key, value]) => {
        if (!value) {
          next.delete(key);
          return;
        }
        next.set(key, value);
      });

      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const normalizedInput = searchInput.trim();
    const normalizedSearch = search.trim();

    if (normalizedInput === normalizedSearch) return;

    const timeout = setTimeout(() => {
      updateQuery({
        search: normalizedInput || undefined,
        page: undefined,
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInput, search, updateQuery]);

  const onStatusChange = (nextStatus: FilterStatus) => {
    updateQuery({
      status: nextStatus === "all" ? undefined : nextStatus,
      page: undefined,
    });
  };

  const closeModal = (modalName: string) => {
    setActiveModal((prev) => ({
      ...prev,
      [modalName]: false,
    }));
  };

  const toggleModal = (modalName: string) => {
    setActiveModal((prev) => ({
      ...Object.keys(prev).reduce(
        (acc, key) => {
          acc[key] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
      [modalName]: !prev[modalName as keyof typeof prev],
    }));
  };

  const onPageChange = (nextPage: number) => {
    updateQuery({
      page: nextPage > 1 ? String(nextPage) : undefined,
    });
  };

  const onCardStatusUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            All Estimates
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totalRecords} appointment{totalRecords !== 1 ? "s" : ""}
            {status !== "all" && ` · ${status}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm">
            <Receipt size={14} className="text-primary" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Page Total:{" "}
              <span className="text-primary">
                ${totalRevenue.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const count = statusCounts[s];
          const isActive = status === s;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                isActive
                  ? s === "all"
                    ? "bg-primary text-white border-primary shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                    : s === "confirmed"
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30"
                      : s === "pending"
                        ? "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 dark:shadow-amber-900/30"
                        : s === "completed"
                          ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-200 dark:shadow-sky-900/30"
                          : "bg-rose-400 text-white border-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900/30"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {s === "confirmed" && <CheckCircle2 size={11} />}
              {s === "pending" && <AlertCircle size={11} />}
              {s === "completed" && <CheckCircle2 size={11} />}
              {s === "cancelled" && <XCircle size={11} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span
                className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Client, Vehicle or Service..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <FilterByDateRange
          startDate={startDate}
          endDate={endDate}
          modalName="dateRange"
          activeModal={activeModal}
          closeModal={closeModal}
          toggleModal={toggleModal}
          queryDateFormat="yyyy-MM-dd"
        />
      </div>

      {estimates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
          <Receipt size={32} className="opacity-40 mb-3" />
          <p className="text-sm font-medium">No estimates found</p>
          <p className="text-xs mt-1 opacity-70">
            Try a different search term or filter
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-[54vh] overflow-y-auto pr-1">
            {estimates.map((est) => (
              <EstimateCard
                key={est.id}
                estimate={est}
                onStatusUpdated={onCardStatusUpdated}
              />
            ))}
          </div>

          {totalRecords > pageSize && (
            <div className="flex justify-end">
              <Pagination
                current={currentPage}
                total={totalRecords}
                pageSize={pageSize}
                showSizeChanger={false}
                onChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
