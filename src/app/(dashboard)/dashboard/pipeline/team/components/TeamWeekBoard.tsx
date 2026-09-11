"use client";

import { WeekMember } from "@/actions/pipelines/getTeamWeekSchedule";
import { cn } from "@/lib/cn";
import { EmployeeType } from "@prisma/client";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import moment from "moment";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchScroll from "../../components/SearchScroll";
import { SelectedEmployee } from "../../components/SearchScrollFilters";
import TeamWeekRow from "./TeamWeekRow";
import { useTeamWorkOrderPanel } from "./useTeamWorkOrderPanel";

interface TeamWeekBoardProps {
  members: WeekMember[];
  weekStart: string;
  employeeType?: EmployeeType;
  selectedEmployee?: SelectedEmployee | null;
}

const LEGEND = [
  { label: "In progress", className: "bg-[#6675FF]" },
  { label: "Pending", className: "bg-amber-500" },
  { label: "Complete", className: "bg-emerald-500" },
  { label: "No status", className: "bg-[#6675FF]/75" },
];

export default function TeamWeekBoard({
  members,
  weekStart,
  employeeType,
  selectedEmployee,
}: TeamWeekBoardProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const { selectedLead, openLead, panel } = useTeamWorkOrderPanel();
  const searchTerm = (searchParams?.get("search") ?? "").toLowerCase().trim();

  const visibleMembers = searchTerm
    ? members.map((member) => ({
        ...member,
        assignments: member.assignments.filter((assignment) =>
          [assignment.title, assignment.clientName, assignment.vehicle]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm),
        ),
      }))
    : members;

  const start = moment.utc(weekStart);
  const end = moment.utc(weekStart).add(6, "days");
  const isThisWeek = moment.utc().isBetween(start, end, "day", "[]");
  const jobCount = visibleMembers.reduce(
    (sum, member) => sum + member.assignments.length,
    0,
  );

  const rangeLabel = start.isSame(end, "month")
    ? `${start.format("MMM D")} – ${end.format("D, YYYY")}`
    : `${start.format("MMM D")} – ${end.format("MMM D, YYYY")}`;

  const goToWeek = (nextStart: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("week", nextStart);
    router.push(`${pathname}?${params.toString()}`);
  };

  const step = (weeks: number) =>
    goToWeek(moment.utc(weekStart).add(weeks, "weeks").format("YYYY-MM-DD"));

  return (
    <>
      <div className="mb-4 px-2">
        <SearchScroll
          pipelineData={[{ id: null, title: "All Work Orders", leads: [] }]}
          isTeamPipeline={true}
          selectedEmployee={selectedEmployee}
        />
      </div>

      <div className="px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous week"
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#6675FF]/40 hover:text-[#6675FF]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next week"
                className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#6675FF]/40 hover:text-[#6675FF]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                {rangeLabel}
              </p>
              <p className="text-[11px] text-slate-400">
                {jobCount} job{jobCount === 1 ? "" : "s"} this week
              </p>
            </div>

            {isThisWeek ? (
              <span className="shrink-0 rounded-md bg-[#6675FF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#6675FF]">
                This week
              </span>
            ) : (
              <button
                type="button"
                onClick={() =>
                  goToWeek(moment.utc().startOf("week").format("YYYY-MM-DD"))
                }
                className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:border-[#6675FF]/40 hover:text-[#6675FF]"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Info className="size-3.5" />
              Each bar = one job, assigned → due
            </span>
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", item.className)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-slate-100 bg-[#6675FF] text-white md:grid-cols-[13rem_minmax(0,1fr)]">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider">
              Team Member
            </p>
            <div className="grid grid-cols-7">
              {Array.from({ length: 7 }).map((_, day) => {
                const date = moment.utc(weekStart).add(day, "days");
                const isToday = date.isSame(moment.utc(), "day");
                return (
                  <div
                    key={day}
                    className={cn(
                      "border-l border-white/15 px-1 py-1.5 text-center",
                      isToday && "bg-white/15",
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase opacity-80">
                      {date.format("ddd")}
                    </p>
                    <p className="text-sm font-bold">{date.format("D")}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {visibleMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <p className="text-lg font-semibold text-gray-500">
                No team members found
              </p>
              <p className="text-sm text-gray-400">
                Nobody matches this filter yet.
              </p>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              {visibleMembers.map((member) => (
                <TeamWeekRow
                  key={member.id}
                  member={member}
                  selectedInvoiceId={selectedLead?.invoiceId}
                  onSelect={(assignment) =>
                    openLead({
                      invoiceId: assignment.invoiceId,
                      name: assignment.clientName,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {panel}
    </>
  );
}
