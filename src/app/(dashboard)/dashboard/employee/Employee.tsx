"use client";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { User } from "@prisma/client";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { generateRandomId } from "@/utils/randomNumber";
import EmployeeTable from "./components/EmployeeTable";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
export default function Employee({
  employees,
  needCompanyName,
}: {
  employees: User[];
  needCompanyName?: boolean;
}) {
  const randomIds: { [key: number]: string } = {};
  const { dateRange, search, type } = useEmployeeFilterStore();
  // const [filteredEmployees, setFilteredEmployees] = useState<User[]>(employees);

  // useEffect(() => {
  //   const filtered = employees.filter((employee) => {
  //     const isWithinDateRange =
  //       dateRange[0] && dateRange[1]
  //         ? moment.utc(employee.joinDate).isSameOrAfter(dateRange[0], "day") &&
  //           moment.utc(employee.joinDate).isSameOrBefore(dateRange[1], "day")
  //         : true;

  //     const isTypeMatch =
  //       type !== "All" ? employee.employeeType === type : true;

  //     const isSearchMatch = search
  //       ? employee.firstName.toLowerCase().includes(search.toLowerCase()) ||
  //         employee.lastName?.toLowerCase().includes(search.toLowerCase()) ||
  //         employee.email.toLowerCase().includes(search.toLowerCase()) ||
  //         employee.phone?.toLowerCase().includes(search.toLowerCase())
  //       : true;

  //     return isWithinDateRange && isTypeMatch && isSearchMatch;
  //   });

  //   setFilteredEmployees(filtered);
  // }, [dateRange, search, type, employees]);

  const filteredEmployees = useMemo(()=>{
    return employees.filter((employee) => {
      const isWithinDateRange =
        dateRange[0] && dateRange[1]
          ? moment.utc(employee.joinDate).isSameOrAfter(dateRange[0], "day") &&
            moment.utc(employee.joinDate).isSameOrBefore(dateRange[1], "day")
          : true;

      const isTypeMatch =
        type !== "All" ? employee.employeeType === type : true;

      const isSearchMatch = search
        ? employee.firstName.toLowerCase().includes(search.toLowerCase()) ||
          employee.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          employee.email.toLowerCase().includes(search.toLowerCase()) ||
          employee.phone?.toLowerCase().includes(search.toLowerCase())
        : true;

      return isWithinDateRange && isTypeMatch && isSearchMatch;
    });
  }, [[dateRange, search, type, employees]])

  return (
    <div className="">
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {filteredEmployees.map((employee, index) => (
          <ResponsiveEmployeeCard key={index} data={employee} index={index} />
        ))}
      </div>

      <EmployeeTable
        filteredEmployees={filteredEmployees}
        randomIds={randomIds}
        needCompanyName={needCompanyName}
      />
    </div>
  );
}
