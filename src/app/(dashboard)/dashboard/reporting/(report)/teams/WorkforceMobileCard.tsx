"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { User, Prisma } from "@prisma/client";
import moment from "moment";
import { useRouter } from "next/navigation";

type TProps = {
  employee: User & {
    Technician: {
      id: number;
      status: string | null;
      amount: Prisma.Decimal | null;
      dateClosed: Date | null;
    }[];
  };
  hasDateRange: boolean;
  formattedStartDate: Date | null;
  formattedEndDate: Date | null;
  index: number;
};

export default function WorkforceMobileCard({
  employee,
  formattedEndDate,
  formattedStartDate,
  hasDateRange,
}: TProps) {
  const router = useRouter();
  const jobsCompleted: number = employee.Technician?.reduce((acc, cur) => {
    const techDate = cur.dateClosed ? moment(cur.dateClosed).utc() : null;

    const isDateValid =
      !hasDateRange ||
      (techDate &&
        techDate.isSameOrAfter(formattedStartDate) &&
        techDate.isSameOrBefore(formattedEndDate));

    if (cur.status === "Complete" && isDateValid) {
      return acc + 1;
    }

    return acc;
  }, 0);

  const totalPayout = employee.Technician.reduce((sum, tech) => {
    const techDate = tech.dateClosed ? moment(tech.dateClosed) : null;

    const isDateValid =
      !hasDateRange ||
      (techDate &&
        techDate.isSameOrAfter(formattedStartDate) &&
        techDate.isSameOrBefore(formattedEndDate));

    if (tech.status === "Complete" && isDateValid) {
      return sum + Number(tech?.amount || 0);
    }

    return sum;
  }, 0);

  const goToDetails = () =>
    router.push(`/dashboard/employee/${employee.id}?view=details`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetails();
        }
      }}
      className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-700/50 sm:p-5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-base font-semibold text-slate-700 dark:text-white sm:text-lg">
          {employee.firstName} {employee.lastName}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          {employee.employeeType}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Total Payout
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(totalPayout)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Jobs Completed
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {jobsCompleted}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Attendance
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            -
          </div>
        </div>
      </div>
    </div>
  );
}
