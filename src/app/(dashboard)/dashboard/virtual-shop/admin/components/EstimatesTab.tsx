"use client";

import { useCallback, useEffect, useState, type ElementType } from "react";
import { Pagination } from "antd";
import FilterByDateRange from "@/app/(dashboard)/dashboard/reporting/components/filter/FilterByDateRange";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  CalendarDays,
  Clock,
  Car,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";

export type AppointmentStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type FilterStatus = "all" | AppointmentStatus;

type EstimateService = {
  name: string;
  vehicleType: string;
  basePrice: number;
  adjustment: number;
  durationMinutes: number;
};

export type Estimate = {
  id: number;
  clientName: string;
  status: AppointmentStatus;
  date: string;
  time: string;
  duration: string;
  vehicle: string;
  services: EstimateService[];
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  total: number;
};

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; icon: ElementType }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    bg: "bg-sky-50 dark:bg-sky-900/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
    icon: XCircle,
  },
};

function getServiceTotal(svc: EstimateService) {
  return svc.basePrice + svc.adjustment;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, bg, text, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function EstimateCard({ estimate }: { estimate: Estimate }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="flex items-start justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#6571FF] to-[#5a66ee] flex items-center justify-center shadow-sm flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{estimate.clientName}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {estimate.date} at {estimate.time}
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <Car size={11} className="flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{estimate.vehicle}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {estimate.duration}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={estimate.status} />
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp size={14} className="text-slate-500" />
            ) : (
              <ChevronDown size={14} className="text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Services</p>
            <div className="space-y-2">
              {estimate.services.map((svc, i) => (
                <div key={i} className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{svc.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">({svc.vehicleType})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {svc.adjustment !== 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-through">${svc.basePrice.toLocaleString()}</span>
                    )}
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      ${getServiceTotal(svc).toLocaleString()}
                    </span>
                    {svc.adjustment !== 0 && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${svc.adjustment > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                        {svc.adjustment > 0 ? "+" : ""}${svc.adjustment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">${estimate.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tax</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">${estimate.taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Service Fee</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">${estimate.serviceFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Total</span>
              <span className="text-base font-bold text-[#6571FF]">${estimate.total.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STATUSES: FilterStatus[] = ["all", "confirmed", "pending", "completed", "cancelled"];

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

  const updateQuery = useCallback((patch: Record<string, string | undefined>) => {
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
  }, [pathname, router, searchParams]);

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
      ...Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>),
      [modalName]: !prev[modalName as keyof typeof prev],
    }));
  };

  const onPageChange = (nextPage: number) => {
    updateQuery({
      page: nextPage > 1 ? String(nextPage) : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">All Estimates</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totalRecords} appointment{totalRecords !== 1 ? "s" : ""}
            {status !== "all" && ` · ${status}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm">
            <Receipt size={14} className="text-[#6571FF]" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Page Total: <span className="text-[#6571FF]">${totalRevenue.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => {
          const count = statusCounts[s];
          const isActive = status === s;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${isActive
                ? s === "all"
                  ? "bg-[#6571FF] text-white border-[#6571FF] shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
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
              <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search client, vehicle or service..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6571FF]/30 focus:border-[#6571FF] transition"
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
          <p className="text-xs mt-1 opacity-70">Try a different search term or filter</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-[54vh] overflow-y-auto thin-scrollbar pr-1">
            {estimates.map(est => (
              <EstimateCard key={est.id} estimate={est} />
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
