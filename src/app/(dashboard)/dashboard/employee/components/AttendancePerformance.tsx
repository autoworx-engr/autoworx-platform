import { EmployeeType } from "@prisma/client";
import React from "react";
import AttendanceTable from "./AttendanceTable";
import PerformanceTable from "./PerformanceTable";
import SalesPerformanceTable from "./SalesPerformanceTable";

export default function AttendancePerformance({
  employeeType,
}: {
  employeeType: EmployeeType;
}) {
  if (employeeType === "Sales") {
    return (
      <div className="mt-10 flex justify-between gap-2">
        <SalesPerformanceTable />
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-2 lg:flex-row lg:justify-between">
      <AttendanceTable />
      <PerformanceTable />
    </div>
  );
}
