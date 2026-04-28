import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import React from "react";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import EmployeeFilter from "../../dashboard/employee/components/EmployeeFilter";
import EmployeeTable from "../../dashboard/employee/components/EmployeeTable";
import { getEmployeesForPaginate } from "@/actions/employee/get";

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

      <EmployeeFilter />

      <EmployeeTable
        needCompanyName
        filteredEmployees={employees as any}
        totalEmployees={totalEmployees}
      />
    </div>
  );
}
