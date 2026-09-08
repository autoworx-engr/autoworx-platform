"use client";

import { cn } from "@/lib/cn";
import { ShopLead } from "@/types/invoiceLead";
import { Technician } from "@prisma/client";
import {
  CalendarCheck2,
  CalendarClock,
  Car,
  DollarSign,
  StickyNote,
  User,
  Wrench,
} from "lucide-react";
import {
  priorityPillClass,
  shortDate,
  statusPillClass,
} from "./teamCardStyles";

interface TeamListCardProps {
  lead: ShopLead;
  isSelected: boolean;
  onSelect: () => void;
  /** Kanban columns are keyed by technician — scopes the assignment rows to that person */
  technicianUserId?: number;
  /** Lets the board register this row for search "jump to result" scrolling */
  registerRef?: (el: HTMLLIElement | null) => void;
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function DateChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
  );
}

function AssignmentRow({ tech }: { tech: Technician }) {
  const assigned = shortDate(tech.date);
  const due = shortDate(tech.due);
  const amount = tech.amount != null ? Number(tech.amount) : null;

  return (
    <div className="min-w-0 space-y-1.5">
      {(assigned || due) && (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {assigned && (
            <DateChip
              icon={<CalendarCheck2 className="size-3" />}
              label={assigned}
            />
          )}
          {due && (
            <DateChip icon={<CalendarClock className="size-3" />} label={due} />
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
        {amount != null && amount > 0 ? (
          <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-emerald-600">
            <DollarSign className="size-3.5 shrink-0" />
            <span className="truncate">{amount.toFixed(2)}</span>
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">No payout set</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {tech.priority && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1",
                priorityPillClass(tech.priority),
              )}
            >
              {tech.priority}
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold",
              statusPillClass(tech.status),
            )}
          >
            {tech.status ?? "No status"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TeamListCard({
  lead,
  isSelected,
  onSelect,
  technicianUserId,
  registerRef,
}: TeamListCardProps) {
  const { completed, incomplete, unAssigned } = lead.services;
  const allServices = [...incomplete, ...unAssigned, ...completed];
  const serviceCount = allServices.length;
  const title = allServices[0] ?? "Work Order";
  const extraServices = serviceCount - 1;

  const assignments = technicianUserId
    ? lead.technicians.filter((tech) => tech.userId === technicianUserId)
    : [];
  const noteCount = assignments.filter((tech) => tech.note).length;

  return (
    <li className="min-w-0" ref={registerRef}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cn(
          "w-full min-w-0 rounded-xl border bg-white p-3 text-left transition-all",
          "hover:border-primary/40 hover:shadow-[0_6px_20px_rgba(101,113,255,0.10)]",
          isSelected
            ? "border-primary/50 ring-2 ring-primary/15"
            : "border-slate-100",
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          <span className="shrink-0 rounded-lg bg-[#6675FF]/10 p-1.5 text-[#6675FF]">
            <Wrench className="size-3.5" />
          </span>
          <p className="min-w-0 flex-1 break-words text-sm font-bold leading-snug text-slate-900">
            {title}
            {extraServices > 0 && (
              <span className="ml-1 font-medium text-slate-400">
                +{extraServices}
              </span>
            )}
          </p>
        </div>

        <div className="mt-2.5 space-y-1.5">
          {lead.vehicle && (
            <InfoRow icon={<Car className="size-3.5" />}>
              {lead.vehicle}
            </InfoRow>
          )}
          <InfoRow icon={<User className="size-3.5" />}>
            {lead.name || "No client"}
          </InfoRow>
        </div>

        {assignments.length > 0 ? (
          <div className="mt-2.5 space-y-2.5">
            {assignments.map((tech) => (
              <AssignmentRow key={tech.id} tech={tech} />
            ))}
          </div>
        ) : (
          <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-medium text-slate-500">
              {completed.length}/{serviceCount} done
            </span>
            {lead.dueBalance > 0 && (
              <span className="shrink-0 text-xs font-bold text-rose-600">
                ${lead.dueBalance.toFixed(2)} due
              </span>
            )}
          </div>
        )}

        {lead.tags.length > 0 && (
          <div className="mt-2.5 flex min-w-0 flex-wrap gap-1">
            {lead.tags.map((invoiceTag) => (
              <span
                key={invoiceTag.id}
                className="max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: invoiceTag.tag?.bgColor ?? "#e2e8f0",
                  color: invoiceTag.tag?.textColor ?? "#0f172a",
                }}
              >
                {invoiceTag.tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <span className="min-w-0 truncate font-mono text-[11px] text-slate-400">
            #{lead.invoiceId}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {lead.columnTitle && (
              <span className="max-w-[7rem] truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {lead.columnTitle}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
