"use client";

import {
  Column,
  DataTable,
  MobileCard,
  StatTile,
} from "@/components/data-table";
import { formatCurrency } from "@/utils/formatCurrency";
import { Prisma, User } from "@prisma/client";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Tech = {
  id: number;
  status: string | null;
  amount: Prisma.Decimal | null;
  dateClosed: Date | null;
};

type EmployeeRow = User & {
  Technician: Tech[];
  jobsCompleted: number;
  totalPayout: number;
  latestCompletion: string;
};

type TProps = {
  employees: (User & { Technician: Tech[] })[];
  hasDateRange: boolean;
  formattedStartDate: any;
  formattedEndDate: any;
  page?: number;
  take?: number;
};

function isDateInRange(
  date: Date | null,
  hasRange: boolean,
  start: any,
  end: any,
): boolean {
  if (!hasRange) return true;
  if (!date) return false;
  const m = moment(date).utc();
  return m.isSameOrAfter(start) && m.isSameOrBefore(end);
}

function deriveStats(
  techs: Tech[],
  hasRange: boolean,
  start: any,
  end: any,
): { jobsCompleted: number; totalPayout: number; latestCompletion: string } {
  let jobsCompleted = 0;
  let totalPayout = 0;
  let latest: moment.Moment | null = null;
  for (const t of techs) {
    if (t.status !== "Complete") continue;
    if (!isDateInRange(t.dateClosed, hasRange, start, end)) continue;
    jobsCompleted += 1;
    totalPayout += Number(t.amount || 0);
    if (t.dateClosed) {
      const m = moment(t.dateClosed);
      if (!latest || m.isAfter(latest)) latest = m;
    }
  }
  return {
    jobsCompleted,
    totalPayout,
    latestCompletion: latest ? latest.format("MM/DD/YYYY") : "N/A",
  };
}

export default function WorkforceDisplay({
  employees,
  hasDateRange,
  formattedStartDate,
  formattedEndDate,
  page,
  take,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.get("search");
  const currentPage = page ?? 1;
  const pageSize = take ?? 50;

  const enriched: EmployeeRow[] = employees.map((emp) => ({
    ...emp,
    ...deriveStats(
      emp.Technician,
      hasDateRange,
      formattedStartDate,
      formattedEndDate,
    ),
  }));

  const startIdx = (currentPage - 1) * pageSize;
  const visible = search
    ? enriched
    : enriched.slice(startIdx, startIdx + pageSize);

  const handlePageChange = (newPage: number, newSize?: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(newPage));
    if (newSize) sp.set("take", String(newSize));
    else sp.delete("take");
    router.push(`${pathname}?${sp.toString()}`);
  };

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (row) => (
        <Link
          className="text-[#6571FF] hover:underline"
          href={`/dashboard/employee/${row.id}?view=details`}
        >
          {row.firstName} {row.lastName}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Employee Type",
      cell: (row) => <span className="text-slate-700">{row.employeeType}</span>,
    },
    {
      key: "payout",
      header: "Total Payout",
      cell: (row) => (
        <span className="font-medium text-slate-700">
          {formatCurrency(row.totalPayout)}
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      cell: () => <span className="text-slate-400">—</span>,
    },
    {
      key: "jobs",
      header: "# Jobs Completed",
      cell: (row) => (
        <span className="text-slate-700">{row.jobsCompleted}</span>
      ),
    },
    {
      key: "completion",
      header: "Completion Date",
      cell: (row) => (
        <span className="text-slate-700">{row.latestCompletion}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={visible}
      rowKey={(r) => r.id}
      pagination={{
        currentPage,
        pageSize,
        totalItems: enriched.length,
        onChange: handlePageChange,
        itemLabel: "employees",
      }}
      renderMobileCard={(row) => (
        <MobileCard
          onClick={() =>
            router.push(`/dashboard/employee/${row.id}?view=details`)
          }
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-600">
                {row.firstName} {row.lastName}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 font-medium">
                Last active {row.latestCompletion}
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {row.employeeType}
            </span>
          </div>

          {/* Stats tiles */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatTile
              label="Total Payout"
              emphasized
              value={formatCurrency(row.totalPayout)}
            />
            <StatTile label="Jobs Completed" value={row.jobsCompleted} />
            <StatTile label="Attendance" value="—" />
            <StatTile label="Completion" value={row.latestCompletion} />
          </div>
        </MobileCard>
      )}
    />
  );
}
