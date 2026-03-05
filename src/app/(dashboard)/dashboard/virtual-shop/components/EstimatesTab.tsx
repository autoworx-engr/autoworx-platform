"use client";

import { useState } from "react";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = "confirmed" | "pending" | "cancelled";

type EstimateService = {
  name: string;
  vehicleType: string;
  basePrice: number;
  adjustment: number;
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
  taxRate: number;
  note?: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ESTIMATES: Estimate[] = [
  {
    id: 1,
    clientName: "John Doe",
    status: "confirmed",
    date: "Feb 24, 2026",
    time: "9:00 AM",
    duration: "9h",
    vehicle: "2023 BMW M3",
    taxRate: 0.0825,
    services: [
      { name: "Full Detail Package", vehicleType: "Sedan", basePrice: 299, adjustment: 50 },
      { name: "Ceramic Coating - 1 Year", vehicleType: "Sedan", basePrice: 599, adjustment: 75 },
    ],
  },
  {
    id: 2,
    clientName: "Sarah Miller",
    status: "confirmed",
    date: "Feb 24, 2026",
    time: "1:00 PM",
    duration: "2h 15m",
    vehicle: "2024 Ford F-150",
    taxRate: 0.0825,
    note: "Please use ceramic-safe soap",
    services: [
      { name: "Express Wash & Wax", vehicleType: "Truck", basePrice: 49, adjustment: 25 },
      { name: "Wheel & Tire Package", vehicleType: "Truck", basePrice: 149, adjustment: 40 },
    ],
  },
  {
    id: 3,
    clientName: "Mike Chen",
    status: "confirmed",
    date: "Feb 25, 2026",
    time: "8:00 AM",
    duration: "16h",
    vehicle: "2022 Tesla Model Y",
    taxRate: 0.0825,
    services: [
      { name: "Multi-Stage Paint Correction", vehicleType: "SUV", basePrice: 799, adjustment: 150 },
      { name: "Ceramic Coating - 5 Year", vehicleType: "SUV", basePrice: 1299, adjustment: 225 },
    ],
  },
  {
    id: 4,
    clientName: "Emily Torres",
    status: "pending",
    date: "Feb 26, 2026",
    time: "10:00 AM",
    duration: "1h 30m",
    vehicle: "2021 Honda Civic",
    taxRate: 0.0825,
    services: [
      { name: "Interior Deep Clean", vehicleType: "Sedan", basePrice: 129, adjustment: 0 },
    ],
  },
  {
    id: 5,
    clientName: "David Park",
    status: "confirmed",
    date: "Feb 27, 2026",
    time: "2:00 PM",
    duration: "1h",
    vehicle: "2020 Toyota Tacoma",
    taxRate: 0.0825,
    services: [
      { name: "Headlight Restoration", vehicleType: "Truck", basePrice: 79, adjustment: 0 },
    ],
  },
  {
    id: 6,
    clientName: "Lisa Wong",
    status: "pending",
    date: "Feb 27, 2026",
    time: "11:00 AM",
    duration: "3h",
    vehicle: "2023 Audi Q5",
    taxRate: 0.0825,
    services: [
      { name: "Engine Bay Detail", vehicleType: "SUV", basePrice: 89, adjustment: 20 },
      { name: "Interior Deep Clean", vehicleType: "SUV", basePrice: 129, adjustment: 20 },
    ],
  },
  {
    id: 7,
    clientName: "James Rivera",
    status: "cancelled",
    date: "Feb 28, 2026",
    time: "9:00 AM",
    duration: "6h",
    vehicle: "2019 Chevrolet Silverado",
    taxRate: 0.0825,
    services: [
      { name: "Single-Stage Paint Correction", vehicleType: "Truck", basePrice: 399, adjustment: 0 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
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

function getEstimateSubtotal(est: Estimate) {
  return est.services.reduce((s, svc) => s + getServiceTotal(svc), 0);
}

function getEstimateTotal(est: Estimate) {
  const sub = getEstimateSubtotal(est);
  return sub + sub * est.taxRate;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, bg, text, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Estimate Card ────────────────────────────────────────────────────────────

function EstimateCard({ estimate }: { estimate: Estimate }) {
  const [expanded, setExpanded] = useState(true);
  const subtotal = getEstimateSubtotal(estimate);
  const tax = subtotal * estimate.taxRate;
  const total = subtotal + tax;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6571FF] to-[#5a66ee] flex items-center justify-center shadow-sm flex-shrink-0">
            <User size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{estimate.clientName}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {estimate.date} at {estimate.time}
              </span>
              <span className="flex items-center gap-1">
                <Car size={11} />
                {estimate.vehicle}
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
            onClick={() => setExpanded((v) => !v)}
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

      {/* Body */}
      {expanded && (
        <>
          {/* Services table */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Services</p>
            <div className="space-y-2">
              {estimate.services.map((svc, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{svc.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">({svc.vehicleType})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {svc.adjustment !== 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-through">${svc.basePrice}</span>
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

          {/* Totals */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tax ({(estimate.taxRate * 100).toFixed(2)}%)</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">${Math.round(tax).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Total</span>
              <span className="text-base font-bold text-[#6571FF]">${Math.round(total).toLocaleString()}</span>
            </div>
          </div>

          {/* Note */}
          {estimate.note && (
            <div className="px-5 py-2.5 border-t border-dashed border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">Note: &ldquo;{estimate.note}&rdquo;</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FilterStatus = "all" | AppointmentStatus;

export default function EstimatesTab() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = ESTIMATES.filter((e) => {
    const matchesSearch =
      search === "" ||
      e.clientName.toLowerCase().includes(search.toLowerCase()) ||
      e.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      e.services.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = filtered.reduce((sum, e) => sum + Math.round(getEstimateTotal(e)), 0);

  const statusCounts: Record<AppointmentStatus, number> = {
    confirmed: ESTIMATES.filter((e) => e.status === "confirmed").length,
    pending: ESTIMATES.filter((e) => e.status === "pending").length,
    cancelled: ESTIMATES.filter((e) => e.status === "cancelled").length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">All Estimates</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} appointment{filtered.length !== 1 ? "s" : ""}
            {filterStatus !== "all" && ` · ${filterStatus}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm">
            <Receipt size={14} className="text-[#6571FF]" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total: <span className="text-[#6571FF]">${totalRevenue.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "confirmed", "pending", "cancelled"] as const).map((s) => {
          const count = s === "all" ? ESTIMATES.length : statusCounts[s];
          const isActive = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${isActive
                ? s === "all"
                  ? "bg-[#6571FF] text-white border-[#6571FF] shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                  : s === "confirmed"
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30"
                    : s === "pending"
                      ? "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 dark:shadow-amber-900/30"
                      : "bg-rose-400 text-white border-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900/30"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
              {s === "confirmed" && <CheckCircle2 size={11} />}
              {s === "pending" && <AlertCircle size={11} />}
              {s === "cancelled" && <XCircle size={11} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, vehicle or service…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6571FF]/30 focus:border-[#6571FF] transition"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${showFilters
            ? "border-[#6571FF] bg-[#6571FF]/10 text-[#6571FF]"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
        >
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* Estimate list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
          <Receipt size={32} className="opacity-40 mb-3" />
          <p className="text-sm font-medium">No estimates found</p>
          <p className="text-xs mt-1 opacity-70">Try a different search term or filter</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[54vh] overflow-y-auto thin-scrollbar pr-1">
          {filtered.map((est) => (
            <EstimateCard key={est.id} estimate={est} />
          ))}
        </div>
      )}
    </div>
  );
}
