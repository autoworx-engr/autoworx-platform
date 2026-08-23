"use client";

import Selector from "@/components/Selector";
import { updateVirtualShopServiceBookingStatus } from "@/service/virtual-shop/api";
import {
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { AppointmentStatus, Estimate } from "./EstimatesTab.types";

const BOOKING_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

function getServiceTotal(svc: Estimate["services"][number]) {
  return svc.basePrice + svc.adjustment;
}

function formatStatusLabel(status: AppointmentStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toApiBookingStatus(status: AppointmentStatus) {
  return status.toUpperCase() as
    | "PENDING"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED";
}

export default function EstimateCard({
  estimate,
  onStatusUpdated,
}: {
  estimate: Estimate;
  onStatusUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [statusValue, setStatusValue] = useState<AppointmentStatus>(
    estimate.status,
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    setStatusValue(estimate.status);
  }, [estimate.status]);

  const onStatusSelectChange = async (nextStatus: AppointmentStatus) => {
    if (nextStatus === statusValue || isUpdatingStatus) return;

    const previousStatus = statusValue;
    setStatusValue(nextStatus);
    setIsUpdatingStatus(true);

    try {
      await updateVirtualShopServiceBookingStatus(
        estimate.id,
        toApiBookingStatus(nextStatus),
      );
      toast.success("Estimate status updated successfully");
      onStatusUpdated();
    } catch (error) {
      setStatusValue(previousStatus);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="flex items-start justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-[#5a66ee] flex items-center justify-center shadow-sm flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">
              {estimate.clientName}
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {estimate.date} at {estimate.time}
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <Car size={11} className="flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {estimate.vehicle}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {estimate.duration}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Selector
            items={BOOKING_STATUSES}
            selectedItem={statusValue}
            onSelect={(status) => {
              onStatusSelectChange(status);
            }}
            label={(item) =>
              formatStatusLabel((item || statusValue) as AppointmentStatus)
            }
            displayList={(item) => (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold">
                {formatStatusLabel(item)}
              </span>
            )}
            newButton={<div className="hidden" />}
            disabledDropdown={isUpdatingStatus}
            showSearch={false}
            className="min-w-[140px] max-w-[150px] [&_button>span]:font-semibold "
          />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="min-w-7 min-h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">
              Services
            </p>
            <div className="space-y-2">
              {estimate.services.map((svc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 sm:gap-3"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {svc.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      ({svc.vehicleType})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {svc.adjustment !== 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                        ${svc.basePrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      ${getServiceTotal(svc).toLocaleString()}
                    </span>
                    {svc.adjustment !== 0 && (
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${svc.adjustment > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"}`}
                      >
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
              <span className="font-medium text-slate-700 dark:text-slate-300">
                ${estimate.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Tax ({estimate.taxRate.toFixed(2)}%)</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                ${estimate.taxAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Service Fee ({estimate.serviceFeeRate.toFixed(2)}%)</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                ${estimate.serviceFee.toLocaleString()}
              </span>
            </div>
            {estimate.tip > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Tip</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  ${estimate.tip.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Total
              </span>
              <span className="text-base font-bold text-primary">
                ${estimate.total.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
