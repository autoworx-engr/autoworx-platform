"use client";

import { cn } from "@/lib/cn";
import { ShopLead } from "@/types/invoiceLead";
import { Car, CircleDollarSign, Wrench } from "lucide-react";

interface TeamListCardProps {
  lead: ShopLead;
  isSelected: boolean;
  onSelect: () => void;
  /** Kanban columns are keyed by technician — scopes the assignment rows to that person */
  technicianUserId?: number;
  /** Lets the board register this row for search "jump to result" scrolling */
  registerRef?: (el: HTMLLIElement | null) => void;
}

const priorityRank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

const priorityClass = (priority: string) =>
  priority === "High"
    ? "bg-red-50 text-red-700 ring-red-100"
    : priority === "Medium"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-emerald-50 text-emerald-700 ring-emerald-100";

const statusClass = (status?: string | null) =>
  status?.toLowerCase().trim() === "complete"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : status
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-slate-100 text-slate-500 ring-slate-200";

const shortDate = (value?: Date | string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

export default function TeamListCard({
  lead,
  isSelected,
  onSelect,
  technicianUserId,
  registerRef,
}: TeamListCardProps) {
  const { completed, incomplete, unAssigned } = lead.services;
  const serviceCount = completed.length + incomplete.length + unAssigned.length;
  const isDone = incomplete.length === 0 && unAssigned.length === 0;

  const technicians = technicianUserId
    ? lead.technicians.filter((tech) => tech.userId === technicianUserId)
    : [];

  const topPriority = lead.technicians.reduce<string | null>((top, tech) => {
    const value = tech.priority ?? null;
    if (!value) return top;
    return !top || (priorityRank[value] ?? 0) > (priorityRank[top] ?? 0)
      ? value
      : top;
  }, null);

  return (
    <li className="min-w-0" ref={registerRef}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cn(
          "w-full min-w-0 rounded-xl border bg-white p-2.5 text-left transition-all sm:p-3",
          "hover:border-primary/40 hover:shadow-[0_6px_20px_rgba(101,113,255,0.10)]",
          isSelected
            ? "border-primary/50 ring-2 ring-primary/15"
            : "border-slate-100",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
            #{lead.invoiceId}
          </span>
          <p className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900">
            {lead.name || "No client"}
          </p>
        </div>

        {(topPriority || lead.columnTitle) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {topPriority && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1",
                  priorityClass(topPriority),
                )}
              >
                {topPriority}
              </span>
            )}
            {lead.columnTitle && (
              <span className="max-w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {lead.columnTitle}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {lead.vehicle && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Car className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{lead.vehicle}</span>
            </span>
          )}

          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <Wrench className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {serviceCount} {serviceCount === 1 ? "service" : "services"}
            </span>
            <span
              className={cn(
                "whitespace-nowrap font-semibold",
                isDone ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {completed.length}/{serviceCount} done
            </span>
          </span>
        </div>

        {technicians.length > 0 && (
          <div className="mt-2 flex min-w-0 flex-col gap-1.5 rounded-lg bg-slate-50 p-2">
            {technicians.map((tech) => (
              <div key={tech.id} className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1",
                      statusClass(tech.status),
                    )}
                  >
                    {tech.status ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1",
                      priorityClass(tech.priority ?? "Low"),
                    )}
                  >
                    {tech.priority ?? "—"}
                  </span>
                  {tech.amount != null && (
                    <span className="ml-auto shrink-0 text-[11px] font-semibold text-slate-700">
                      ${Number(tech.amount).toFixed(2)}
                    </span>
                  )}
                </div>

                <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-[11px] text-slate-500">
                  {tech.date && (
                    <>
                      <dt className="font-medium">Assigned</dt>
                      <dd className="truncate">{shortDate(tech.date)}</dd>
                    </>
                  )}
                  {tech.due && (
                    <>
                      <dt className="font-medium">Due</dt>
                      <dd className="truncate">{shortDate(tech.due)}</dd>
                    </>
                  )}
                </dl>

                {tech.note && (
                  <p className="line-clamp-2 break-words text-[11px] italic text-slate-400">
                    {tech.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {lead.tags.length > 0 && (
          <div className="mt-2 flex min-w-0 flex-wrap gap-1">
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
      </button>
    </li>
  );
}
