"use client";
import Avatar from "@/components/Avatar";
import { User } from "@prisma/client";
import EditEmployee from "../EditEmployee";
import { EmployeeWorkInfo } from "./employeeWorkInfoType";
import Payout from "./Payout";
import PayoutSales from "./PayoutSales";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

export default function EmployeeInformation({
  employee,
  info,
}: {
  employee: User;
  info: EmployeeWorkInfo;
}) {
  const timezone = useCompanyTimezone();
  return (
    <div className="my-8 flex w-full flex-col justify-between gap-3 lg:flex-row lg:gap-5">
      <div className="relative hidden w-full items-center rounded border border-gray-300 bg-background p-3 pt-10 lg:flex">
        <div className="absolute right-2 top-1">
          <EditEmployee employee={employee} settingIcon />
        </div>
        <div className="mr-3 flex flex-col items-center">
          <Avatar photo={employee.image} width={100} height={100} />

          <div className="mt-2 text-gray-600">{employee.employeeType}</div>
        </div>

        <div className="w-full text-sm">
          <div className="mb-1 flex items-center">
            <label className="mr-6 block w-20 text-gray-600">Name</label>
            <input
              type="text"
              value={`${employee.firstName} ${employee.lastName}`}
              readOnly
              className="block w-full rounded border border-gray-300 p-1 text-gray-600"
            />
          </div>
          <div className="mb-1 flex items-center">
            <label className="mr-6 block w-20 text-gray-600">Email</label>
            <input
              type="email"
              value={employee.email}
              readOnly
              className="block w-full rounded border border-gray-300 p-1 text-gray-600"
            />
          </div>
          <div className="mb-1 flex items-center">
            <label className="mr-6 block w-20 text-gray-600">Phone</label>
            <input
              type="text"
              value={employee.phone!}
              readOnly
              className="block w-full rounded border border-gray-300 p-1 text-gray-600"
            />
          </div>
          <div className="flex items-center">
            <label className="mr-6 block w-20 text-gray-600">Address</label>
            <input
              type="text"
              value={employee.address!}
              readOnly
              className="block w-full rounded border border-gray-300 p-1 text-gray-600"
            />
          </div>
        </div>
      </div>
      <div className="relative lg:hidden">
        <div className="absolute right-2 top-1">
          <EditEmployee employee={employee} settingIcon />
        </div>
        <ResponsiveEmployeeCard data={employee} index={0} />
      </div>

      {employee.employeeType !== "Sales" ? (
        <Payout info={info} />
      ) : (
        <PayoutSales employee={employee} timezone={timezone} />
      )}
    </div>
  );
}
