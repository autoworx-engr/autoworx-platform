"use client";

import { useMemo, useState, type ElementType } from "react";
import { useSession } from "next-auth/react";
import { Pagination } from "antd";
import {
  Search,
  Filter,
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
  Loader2,
} from "lucide-react";
import { useGetVirtualShopServiceBookings } from "@/hooks/virtual-shop/service-booking/useShopServiceBooking";
import type { VirtualShopServiceBookingItem } from "@/service/virtual-shop/api";

type AppointmentStatus = "confirmed" | "pending" | "cancelled" | "completed";

type EstimateService = {
  name: string;
  vehicleType: string;
  basePrice: number;
  adjustment: number;
  durationMinutes: number;
};

type Estimate = {
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

const PAGE_SIZE = 10;

function mapStatus(status?: string | null): AppointmentStatus {
  const normalized = (status || "").toLowerCase();

  if (normalized === "confirmed") return "confirmed";
  if (normalized === "pending") return "pending";
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled") return "cancelled";

  return "pending";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;

  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "-";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;

  return `${hours}h ${mins}m`;
}

function getDurationLabel(item: VirtualShopServiceBookingItem) {
  const startMinutes = parseTimeToMinutes(item.appointment?.startTime);
  const endMinutes = parseTimeToMinutes(item.appointment?.endTime);

  if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
    return formatDuration(endMinutes - startMinutes);
  }

  const servicesDuration = item.services.reduce((sum, svc) => {
    const next = Number(svc.duration || 0);
    return sum + (Number.isFinite(next) ? next : 0);
  }, 0);

  return formatDuration(servicesDuration);
}

function getVehicleLabel(item: VirtualShopServiceBookingItem) {
  const segments = [item.vehicle?.year, item.vehicle?.make, item.vehicle?.model]
    .map(part => (part ?? "").toString().trim())
    .filter(Boolean);

  return segments.length > 0 ? segments.join(" ") : "Vehicle not provided";
}

function mapBookingToEstimate(item: VirtualShopServiceBookingItem): Estimate {
  const services = item.services.map(svc => ({
    name: svc.title,
    vehicleType: svc.modifierType || "Vehicle",
    basePrice: Number(svc.price || 0),
    adjustment: Number(svc.modifierPrice || 0),
    durationMinutes: Number(svc.duration || 0),
  }));

  const fallbackSubtotal = services.reduce(
    (sum, svc) => sum + svc.basePrice + svc.adjustment,
    0,
  );

  const subtotal = Number(item.subtotal ?? fallbackSubtotal);
  const taxAmount = Number(item.tax ?? 0);
  const serviceFee = Number(item.serviceFee ?? 0);
  const total = Number(item.total ?? subtotal + taxAmount + serviceFee);

  const fullName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();

  return {
    id: item.id,
    clientName: fullName || "Unknown Client",
    status: mapStatus(item.status),
    date: formatDateLabel(item.appointment?.date),
    time: formatTime(item.appointment?.startTime),
    duration: getDurationLabel(item),
    vehicle: getVehicleLabel(item),
    services,
    subtotal,
    taxAmount,
    serviceFee,
    total,
  };
}

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

type FilterStatus = "all" | AppointmentStatus;

export default function EstimatesTab() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken || "";

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const bookingStatus = filterStatus === "all" ? undefined : filterStatus;

  const { data, isLoading, isFetching, isError } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: bookingStatus,
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const { data: allCountData } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page: 1,
      limit: 1,
      search: search || undefined,
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const { data: confirmedCountData } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page: 1,
      limit: 1,
      search: search || undefined,
      status: "confirmed",
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const { data: pendingCountData } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page: 1,
      limit: 1,
      search: search || undefined,
      status: "pending",
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const { data: completedCountData } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page: 1,
      limit: 1,
      search: search || undefined,
      status: "completed",
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const { data: cancelledCountData } = useGetVirtualShopServiceBookings(
    {
      accessToken,
      page: 1,
      limit: 1,
      search: search || undefined,
      status: "cancelled",
      sortOrder: "desc",
    },
    Boolean(accessToken),
  );

  const estimates = useMemo(
    () => (data?.data || []).map(mapBookingToEstimate),
    [data?.data],
  );

  const totalRevenue = estimates.reduce((sum, e) => sum + e.total, 0);

  const statusCounts = {
    all: allCountData?.meta?.totalRecords || 0,
    confirmed: confirmedCountData?.meta?.totalRecords || 0,
    pending: pendingCountData?.meta?.totalRecords || 0,
    completed: completedCountData?.meta?.totalRecords || 0,
    cancelled: cancelledCountData?.meta?.totalRecords || 0,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">All Estimates</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.meta?.totalRecords || 0} appointment{(data?.meta?.totalRecords || 0) !== 1 ? "s" : ""}
            {filterStatus !== "all" && ` · ${filterStatus}`}
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
        {(["all", "confirmed", "pending", "completed", "cancelled"] as const).map(s => {
          const count = statusCounts[s];
          const isActive = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => {
                setFilterStatus(s);
                setPage(1);
              }}
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

      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search client, vehicle or service..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6571FF]/30 focus:border-[#6571FF] transition"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${showFilters
            ? "border-[#6571FF] bg-[#6571FF]/10 text-[#6571FF]"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
        >
          <Filter size={13} />
          Filter
        </button>
      </div>

      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Loading estimates...
        </div>
      )}

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
          <Receipt size={32} className="opacity-40 mb-3" />
          <p className="text-sm font-medium">Failed to load estimates</p>
          <p className="text-xs mt-1 opacity-70">Please try again in a moment</p>
        </div>
      ) : estimates.length === 0 ? (
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

          {(data?.meta?.totalRecords || 0) > PAGE_SIZE && (
            <div className="flex justify-end">
              <Pagination
                current={page}
                total={data?.meta?.totalRecords || 0}
                pageSize={PAGE_SIZE}
                showSizeChanger={false}
                onChange={nextPage => setPage(nextPage)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
