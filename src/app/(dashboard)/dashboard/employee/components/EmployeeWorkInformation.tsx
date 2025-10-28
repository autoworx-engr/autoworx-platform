"use client";

import {  User } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import AttendancePerformance from "./AttendancePerformance";
import EmployeeInfoTable from "./EmployeeInfoTable";
import { EmployeeWorkInfo, SalesInfo } from "./employeeWorkInfoType";
import FilterComp from "./FilterComp";
import SalesInfoTable from "./SalesInfoTable";

export default function EmployeeWorkInformation({
  info,
  salesInfo,
  employee,
}: {
  info: EmployeeWorkInfo;
  salesInfo: SalesInfo[];
  employee: User;
}) {
  const searchParams = useSearchParams();
  const activeView = searchParams?.get("view") || "details";

  const { service, category } = info.reduce(
    (acc, technician: any) => {
      acc.service = technician?.invoice?.invoiceItems.map(
        (item: any) => item?.service?.name,
      );
      acc.category = technician.invoice.invoiceItems.map(
        (item: any) => item?.service?.category?.name,
      );
      return acc;
    },
    { service: [], category: [] },
  );

  if (activeView === "details") {
    return (
      <>
        <div className="hidden lg:flex">
          <FilterComp service={service} category={category} />
        </div>
        {employee.employeeType !== "Sales" ? (
          <EmployeeInfoTable info={info} />
        ) : (
          <SalesInfoTable info={salesInfo} employee={employee} />
        )}
      </>
    );
  }

  return <AttendancePerformance employeeType={employee.employeeType} />;
}
