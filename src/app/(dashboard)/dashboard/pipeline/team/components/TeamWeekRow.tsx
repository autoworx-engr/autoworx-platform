"use client";

import {
  WeekAssignment,
  WeekMember,
} from "@/actions/pipelines/getTeamWeekSchedule";
import { cn } from "@/lib/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TeamWeekRowProps {
  member: WeekMember;
  onSelect: (assignment: WeekAssignment) => void;
  selectedInvoiceId?: string;
}

const roleBadgeClass = (employeeType?: string | null) => {
  if (employeeType === "Technician") return "bg-emerald-100 text-emerald-700";
  if (employeeType === "Manager") return "bg-blue-100 text-blue-700";
  if (employeeType === "Admin") return "bg-violet-100 text-violet-700";
  if (employeeType === "Sales") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

/** Primary-led palette: everything is the brand colour unless status says otherwise */
const barClass = (status?: string | null) => {
  const value = status?.toLowerCase().trim() ?? "";
  if (value.startsWith("complete") || value === "done" || value === "ready") {
    return "bg-emerald-500";
  }
  if (value.includes("pending") || value.includes("wait")) {
    return "bg-amber-500";
  }
  if (value.includes("progress")) return "bg-[#6675FF]";
  return "bg-[#6675FF]/75";
};

/**
 * Greedy interval packing — two jobs whose day ranges overlap can't share a
 * line, so each gets its own lane (Marcus in the reference has two).
 *
 * Packing must walk the jobs in start order to stay correct, so the finished
 * lanes are then ordered by their soonest due date: the most urgent job sits on
 * the member's top line.
 */
function packLanes(assignments: WeekAssignment[]) {
  const lanes: WeekAssignment[][] = [];

  for (const assignment of [...assignments].sort(
    (a, b) => a.startDay - b.startDay || a.endDay - b.endDay,
  )) {
    const lane = lanes.find(
      (candidate) =>
        candidate[candidate.length - 1].endDay < assignment.startDay,
    );
    if (lane) lane.push(assignment);
    else lanes.push([assignment]);
  }

  // Soonest work order due date first; undated lanes sink to the bottom
  const laneDue = (lane: WeekAssignment[]) =>
    lane.reduce(
      (soonest, assignment) =>
        assignment.dueDate && assignment.dueDate < soonest
          ? assignment.dueDate
          : soonest,
      "9999-12-31",
    );

  return lanes.sort((a, b) => laneDue(a).localeCompare(laneDue(b)));
}

export default function TeamWeekRow({
  member,
  onSelect,
  selectedInvoiceId,
}: TeamWeekRowProps) {
  const lanes = packLanes(member.assignments);

  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-slate-100 last:border-b-0 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="min-w-0 border-r border-slate-100 bg-white px-3 py-3">
        <p className="truncate text-sm font-bold text-slate-900">
          {member.name || "Unassigned"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {member.employeeType && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                roleBadgeClass(member.employeeType),
              )}
            >
              {member.employeeType}
            </span>
          )}
          <span className="text-[10px] font-medium text-slate-400">
            {member.assignments.length} job
            {member.assignments.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="relative min-w-0 bg-slate-50/40 py-2">
        {/* Day gridlines */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
          {Array.from({ length: 7 }).map((_, day) => (
            <div
              key={day}
              className="border-r border-slate-100 last:border-r-0"
            />
          ))}
        </div>

        {lanes.length === 0 ? (
          <p className="px-3 py-1.5 text-xs text-slate-300">
            No jobs this week
          </p>
        ) : (
          <div className="relative space-y-1.5">
            {lanes.map((lane, laneIndex) => (
              <div key={laneIndex} className="grid grid-cols-7 gap-0">
                {lane.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => onSelect(assignment)}
                    style={{
                      gridColumnStart: assignment.startDay + 1,
                      gridColumnEnd: assignment.endDay + 2,
                    }}
                    className={cn(
                      "mx-1 min-w-0 overflow-hidden px-2 py-1.5 text-left text-white transition-all hover:brightness-110",
                      barClass(assignment.status),
                      assignment.startsBefore
                        ? "rounded-l-none"
                        : "rounded-l-md",
                      assignment.endsAfter ? "rounded-r-none" : "rounded-r-md",
                      selectedInvoiceId === assignment.invoiceId &&
                        "ring-2 ring-slate-900/20",
                    )}
                    title={`${assignment.title} · ${assignment.clientName}`}
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      {assignment.startsBefore && (
                        <ChevronLeft className="size-3 shrink-0 opacity-80" />
                      )}
                      <span className="truncate text-[11px] font-bold">
                        {assignment.title}
                      </span>
                      {assignment.endsAfter && (
                        <ChevronRight className="ml-auto size-3 shrink-0 opacity-80" />
                      )}
                    </span>
                    {assignment.vehicle && (
                      <span className="block truncate text-[10px] text-white/75">
                        {assignment.vehicle}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
