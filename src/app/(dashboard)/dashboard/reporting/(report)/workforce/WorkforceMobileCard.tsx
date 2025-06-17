"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { User, Prisma } from "@prisma/client";

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
  index,
  formattedEndDate,
  formattedStartDate,
  hasDateRange,
}: TProps) {
  const jobsCompleted: number = employee.Technician?.reduce((acc, cur) => {
    const techDate = cur.dateClosed ? new Date(cur.dateClosed) : null;

    const isDateValid =
      !hasDateRange ||
      (techDate !== null &&
        techDate >= formattedStartDate! &&
        techDate <= formattedEndDate!);

    if (cur.status === "Complete" && isDateValid) {
      return acc + 1;
    }

    return acc;
  }, 0);

  const totalPayout = employee.Technician.reduce((sum, tech) => {
    const techDate = tech.dateClosed ? new Date(tech.dateClosed) : null;

    const isDateValid =
      !hasDateRange ||
      (techDate !== null &&
        techDate >= formattedStartDate! &&
        techDate <= formattedEndDate!);

    if (tech.status === "Complete" && isDateValid) {
      return sum + Number(tech?.amount || 0);
    }

    return sum;
  }, 0);
  return (
    <div
      className={`rounded-lg border p-4 shadow-md ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">
          {employee.firstName} {employee.lastName}
        </div>
        <div className="text-sm text-[#66738C]">{employee.employeeType}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <div className="text-sm text-[#66738C]">Total Payout</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(totalPayout)}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Jobs Completed</div>
          <div className="font-semibold text-[#66738C]">{jobsCompleted}</div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Attendance</div>
          <div className="font-semibold text-[#66738C]">-</div>
        </div>
      </div>
    </div>
  );
}
