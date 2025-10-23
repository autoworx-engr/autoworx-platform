import { getEmployeesForPaginate } from "@/actions/employee/get";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { SalaryHistory, User } from "@prisma/client";
import { PieChart } from "lucide-react";
import Link from "next/link";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import EmployeeFilter from "./components/EmployeeFilter";
import EmployeeTable from "./components/EmployeeTable";
import TotalPayouts from "./TotalPayouts";

export default async function Page() {
  const companyId = await getCompanyId();
  const { employees, totalEmployees } = await getEmployeesForPaginate({
    companyId,
    take: 50,
    page: 1,
  });

  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Employee List</Title>

      <div className="hidden flex-wrap items-center justify-between gap-y-8 lg:flex">
        <TotalPayouts />
        <div>
          {/* /reporting/workforce */}
          <Link
            href="/dashboard/reporting/teams"
            className="flex items-center gap-x-2 rounded-md bg-slate-100 p-2 px-5 text-[#6571FF] shadow-md"
          >
            <PieChart className="w-5 h-5" />
            <span>Teams Reporting</span>
          </Link>
        </div>
      </div>

      <EmployeeFilter />

      <EmployeeTable
        filteredEmployees={
          employees as (User & { salaryHistory: SalaryHistory[] })[]
        }
        totalEmployees={totalEmployees}
      />
    </div>
  );
}
