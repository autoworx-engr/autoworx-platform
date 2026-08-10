"use client";

import { Car, Clock, User } from "lucide-react";
import CalendarStatusBadge from "./CalendarStatusBadge";
import type { Appointment } from "./CalendarTab.types";
import { getTotalRevenue } from "./CalendarTab.utils";

export default function CalendarAppointmentCard({
  appt,
}: {
  appt: Appointment;
}) {
  const total = getTotalRevenue(appt);

  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary to-[#5a66ee] flex items-center justify-center shadow-sm flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">
              {appt.clientName}
            </p>
          </div>
          <CalendarStatusBadge status={appt.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pl-[42px] sm:pl-[46px]">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock size={11} />
            {appt.startTime} - {appt.endTime}
          </span>
          <span className="flex items-center gap-1 min-w-0">
            <Car size={11} className="flex-shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">
              {appt.vehicle}
            </span>
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 space-y-1.5">
        {appt.services.map((svc, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 sm:gap-3 text-sm"
          >
            <span className="text-slate-700 dark:text-slate-300 min-w-0">
              <span className="truncate block sm:inline">{svc.name}</span>{" "}
              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                ({svc.vehicleType})
              </span>
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200 flex-shrink-0">
              ${svc.price.toLocaleString()}
              {svc.extraFee > 0 ? ` + $${svc.extraFee.toLocaleString()}` : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
          Total
        </span>
        <span className="text-base font-bold text-primary">
          ${total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
