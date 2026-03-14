"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Clock,
  Car,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppointmentStatus = "confirmed" | "pending" | "cancelled";

type AppointmentService = {
  name: string;
  vehicleType: string;
  price: number;
};

type Appointment = {
  id: number;
  clientName: string;
  status: AppointmentStatus;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  vehicle: string;
  services: AppointmentService[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    clientName: "John Doe",
    status: "confirmed",
    date: "2026-02-24",
    startTime: "9:00 AM",
    endTime: "6:00 PM",
    vehicle: "2023 BMW M3",
    services: [
      { name: "Full Detail Package", vehicleType: "Sedan", price: 349 },
      { name: "Ceramic Coating - 1 Year", vehicleType: "Sedan", price: 674 },
    ],
  },
  {
    id: 2,
    clientName: "Sarah Miller",
    status: "confirmed",
    date: "2026-02-24",
    startTime: "1:00 PM",
    endTime: "3:15 PM",
    vehicle: "2024 Ford F-150",
    services: [
      { name: "Express Wash & Wax", vehicleType: "Truck", price: 74 },
      { name: "Wheel & Tire Package", vehicleType: "Truck", price: 189 },
    ],
  },
  {
    id: 3,
    clientName: "Mike Chen",
    status: "confirmed",
    date: "2026-02-25",
    startTime: "8:00 AM",
    endTime: "12:00 PM",
    vehicle: "2022 Tesla Model Y",
    services: [
      { name: "Multi-Stage Paint Correction", vehicleType: "SUV", price: 949 },
      { name: "Ceramic Coating - 5 Year", vehicleType: "SUV", price: 1524 },
    ],
  },
  {
    id: 4,
    clientName: "Emily Torres",
    status: "pending",
    date: "2026-02-26",
    startTime: "10:00 AM",
    endTime: "11:30 AM",
    vehicle: "2021 Honda Civic",
    services: [{ name: "Interior Deep Clean", vehicleType: "Sedan", price: 129 }],
  },
  {
    id: 5,
    clientName: "David Park",
    status: "confirmed",
    date: "2026-02-27",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    vehicle: "2020 Toyota Tacoma",
    services: [{ name: "Headlight Restoration", vehicleType: "Truck", price: 79 }],
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

const STATUS_DOT: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-400",
  cancelled: "bg-rose-400",
};

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string) {
  return a === b;
}

function getTotalRevenue(appt: Appointment) {
  return appt.services.reduce((sum, s) => sum + s.price, 0);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, bg, text, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const total = getTotalRevenue(appt);
  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#6571FF] to-[#5a66ee] flex items-center justify-center shadow-sm flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{appt.clientName}</p>
          </div>
          <StatusBadge status={appt.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pl-[42px] sm:pl-[46px]">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock size={11} />
            {appt.startTime} – {appt.endTime}
          </span>
          <span className="flex items-center gap-1 min-w-0">
            <Car size={11} className="flex-shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{appt.vehicle}</span>
          </span>
        </div>
      </div>

      {/* Services */}
      <div className="px-4 sm:px-5 py-3 space-y-1.5">
        {appt.services.map((svc, i) => (
          <div key={i} className="flex items-center justify-between gap-2 sm:gap-3 text-sm">
            <span className="text-slate-700 dark:text-slate-300 min-w-0">
              <span className="truncate block sm:inline">{svc.name}</span>{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">({svc.vehicleType})</span>
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200 flex-shrink-0">${svc.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Total</span>
        <span className="text-base font-bold text-[#6571FF]">${total.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  appointments,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  // Index appointments by date
  const apptByDate: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!apptByDate[a.date]) apptByDate[a.date] = [];
    apptByDate[a.date].push(a);
  });

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Day headers */}
      {DAY_LABELS.map((d) => (
        <div
          key={d}
          className="bg-slate-50 dark:bg-slate-800 text-center text-[9px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-2 sm:py-3"
        >
          {d}
        </div>
      ))}

      {/* Cells */}
      {cells.map((day, idx) => {
        if (day === null) {
          return <div key={`empty-${idx}`} className="bg-white dark:bg-slate-900 min-h-[52px] sm:min-h-[80px] md:min-h-[88px]" />;
        }
        const dateKey = formatDateKey(year, month, day);
        const dayAppts = apptByDate[dateKey] ?? [];
        const isSelected = isSameDay(dateKey, selectedDate);
        const isToday = isSameDay(dateKey, todayKey);

        return (
          <button
            key={dateKey}
            onClick={() => onSelectDate(dateKey)}
            className={`relative bg-white dark:bg-slate-900 min-h-[52px] sm:min-h-[80px] md:min-h-[88px] p-1 sm:p-2 flex flex-col items-start text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:outline-none ${isSelected
              ? "ring-2 ring-inset ring-[#6571FF] bg-indigo-50/40 dark:bg-indigo-900/10"
              : ""
              }`}
          >
            <span
              className={`text-[9px] sm:text-xs font-semibold mb-0.5 sm:mb-1.5 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors ${isSelected
                ? "bg-[#6571FF] text-white"
                : isToday
                  ? "text-[#6571FF] bg-indigo-100 dark:bg-indigo-900/40"
                  : "text-slate-600 dark:text-slate-400"
                }`}
            >
              {day}
            </span>
            {/* Appointment dots */}
            {dayAppts.length > 0 && (
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${STATUS_DOT[a.status]}`}
                  />
                ))}
                {dayAppts.length > 3 && (
                  <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 font-medium">+{dayAppts.length - 3}</span>
                )}
              </div>
            )}
            {/* First appointment preview (md+) */}
            {dayAppts.length > 0 && (
              <p className="hidden md:block mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate w-full leading-tight">
                {dayAppts[0].clientName}
                {dayAppts.length > 1 && ` +${dayAppts.length - 1}`}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ appointments }: { appointments: Appointment[] }) {
  // Group by date
  const grouped: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  });
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const [y, m, d] = dateKey.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const label = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return (
          <div key={dateKey}>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 sm:mb-3">{label}</p>
            <div className="space-y-3">
              {grouped[dateKey].map((a) => (
                <AppointmentCard key={a.id} appt={a} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarTab() {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDate, setSelectedDate] = useState(
    formatDateKey(now.getFullYear(), now.getMonth(), now.getDate())
  );

  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedAppts = APPOINTMENTS.filter((a) => a.date === selectedDate);
  const selectedDateLabel = (() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  const totalAppts = APPOINTMENTS.filter((a) => {
    const [y, m] = a.date.split("-").map(Number);
    return y === viewYear && m - 1 === viewMonth;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={goToPrev}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 min-w-[110px] sm:min-w-[160px] text-center tabular-nums">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={goToNext}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          {totalAppts > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-[#6571FF]">
              {totalAppts} appt{totalAppts !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 ${viewMode === "grid"
              ? "bg-[#6571FF] text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
          >
            <LayoutGrid size={14} /> Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 ${viewMode === "list"
              ? "bg-[#6571FF] text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
          >
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <ListView appointments={APPOINTMENTS} />
      ) : (
        <>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            appointments={APPOINTMENTS}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Selected day panel */}
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 sm:mb-3">{selectedDateLabel}</p>
            {selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">No appointments on this day</p>
                <p className="text-xs mt-1 opacity-70">Select a date with dots to view appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAppts.map((a) => (
                  <AppointmentCard key={a.id} appt={a} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
