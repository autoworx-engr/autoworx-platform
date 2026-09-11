"use client";

import { cn } from "@/lib/cn";
import { ShopLead } from "@/types/invoiceLead";
import { CalendarClock, Car, User, Wrench } from "lucide-react";
import {
  priorityPillClass,
  shortDate,
  statusPillClass,
} from "./teamCardStyles";

interface TeamListRowProps {
  lead: ShopLead;
  isSelected: boolean;
  onSelect: () => void;
}

const priorityRank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function summarise(lead: ShopLead) {
  let payout = 0;
  let assigned: Date | null = null;
  let due: Date | null = null;
  let topPriority: string | null = null;
  const statuses = new Set<string>();

  for (const tech of lead.technicians) {
    if (tech.amount != null) payout += Number(tech.amount);
    if (tech.status) statuses.add(tech.status);
    if (tech.date && (!assigned || tech.date < assigned)) assigned = tech.date;
    if (tech.due && (!due || tech.due < due)) due = tech.due;
    if (
      tech.priority &&
      (!topPriority ||
        (priorityRank[tech.priority] ?? 0) > (priorityRank[topPriority] ?? 0))
    ) {
      topPriority = tech.priority;
    }
  }

  return { payout, assigned, due, topPriority, statuses: [...statuses] };
}

export default function TeamListRow({
  lead,
  isSelected,
  onSelect,
}: TeamListRowProps) {
  const { completed, incomplete, unAssigned } = lead.services;
  const allServices = [...incomplete, ...unAssigned, ...completed];
  const total = allServices.length;
  const title = allServices[0] ?? "Work Order";
  const extra = total - 1;
  const percent = total ? Math.round((completed.length / total) * 100) : 0;

  const { payout, assigned, due, topPriority, statuses } = summarise(lead);
  const techCount = lead.technicians.length;

  const appointmentDate = shortDate(lead.appointment?.date);
  const appointmentLabel = appointmentDate
    ? [appointmentDate, lead.appointment?.startTime].filter(Boolean).join(" ")
    : null;

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cn(
          "grid w-full min-w-0 grid-cols-1 items-center gap-x-4 gap-y-2 rounded-lg border bg-white px-4 py-3.5 text-left transition-all md:min-h-[4.75rem]",
          "hover:border-primary/40 hover:shadow-[0_4px_14px_rgba(101,113,255,0.10)]",
          "md:grid-cols-12",
          isSelected
            ? "border-primary/50 ring-2 ring-primary/15"
            : "border-slate-100",
        )}
      >
        {/* Service + client + vehicle */}
        <div className="col-span-1 flex min-w-0 items-center gap-2 md:col-span-4">
          <span className="shrink-0 rounded-md bg-[#6675FF]/10 p-1.5 text-[#6675FF]">
            <Wrench className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {title}
              {extra > 0 && (
                <span className="ml-1 font-medium text-slate-400">
                  +{extra}
                </span>
              )}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
              <span className="flex min-w-0 items-center gap-1">
                <User className="size-3 shrink-0" />
                <span className="truncate">{lead.name || "No client"}</span>
              </span>
              {lead.vehicle && (
                <span className="flex min-w-0 items-center gap-1">
                  <Car className="size-3 shrink-0" />
                  <span className="truncate">{lead.vehicle}</span>
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 text-[10px] text-slate-400">
              <span className="truncate font-mono">#{lead.invoiceId}</span>
              {appointmentLabel && (
                <span className="flex min-w-0 items-center gap-1">
                  <CalendarClock className="size-3 shrink-0" />
                  <span className="truncate">{appointmentLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Service progress */}
        <div className="col-span-1 min-w-0 md:col-span-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>
              {completed.length}/{total} done
            </span>
            <span
              className={cn(
                "font-semibold",
                percent === 100 ? "text-emerald-600" : "text-slate-600",
              )}
            >
              {percent}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full",
                percent === 100 ? "bg-emerald-500" : "bg-slate-400",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="col-span-1 min-w-0 text-[11px] md:col-span-2">
          <p className="truncate text-slate-500">
            <span className="font-medium text-slate-400">Assigned </span>
            {shortDate(assigned) ?? "—"}
          </p>
          <p className="truncate text-slate-500">
            <span className="font-medium text-slate-400">Due </span>
            {shortDate(due) ?? "—"}
          </p>
        </div>

        {/* Money */}
        <div className="col-span-1 min-w-0 text-[11px] md:col-span-2">
          <p className="truncate font-bold text-slate-600">
            {payout > 0 ? `$${payout.toFixed(2)}` : "No payout"}
          </p>
          <p
            className={cn(
              "truncate font-semibold",
              lead.dueBalance > 0 ? "text-rose-600" : "text-slate-400",
            )}
          >
            {lead.dueBalance > 0
              ? `$${lead.dueBalance.toFixed(2)} due`
              : "Settled"}
          </p>
        </div>

        {/* Status + stage */}
        <div className="col-span-1 flex min-w-0 flex-wrap items-center justify-start gap-1 md:col-span-2 md:justify-end">
          {topPriority && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                priorityPillClass(topPriority),
              )}
            >
              {topPriority}
            </span>
          )}
          {statuses.slice(0, 2).map((status) => (
            <span
              key={status}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                statusPillClass(status),
              )}
            >
              {status}
            </span>
          ))}
          {techCount > 0 && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {techCount} technician{techCount > 1 ? "s" : ""}
            </span>
          )}
          {lead.columnTitle && (
            <span className="max-w-[6rem] truncate rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {lead.columnTitle}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}
