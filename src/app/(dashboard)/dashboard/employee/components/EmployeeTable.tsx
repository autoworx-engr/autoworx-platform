"use client";

import { cn } from "@/lib/cn";
import moment from "moment";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import EditEmployee from "../EditEmployee";
import DeleteEmployee from "../DeleteEmployee";
import { SalaryHistory, User } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { padId } from "@/lib/padId";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import useEmployeeQuery from "../_hook/useEmployeeQuery";

const defaultPageSize = 20;
type UserWithSalaryHistory = (User & { salaryHistory: SalaryHistory[] })[];

const EmployeeTable = ({
  filteredEmployees = [],
  needCompanyName = false,
  totalEmployees = 0,
}: {
  filteredEmployees?: UserWithSalaryHistory;
  totalEmployees?: number;
  needCompanyName?: boolean;
}) => {
  const { dateRange, search, type, setPaginate, currentPage, pageSize } =
    useEmployeeFilterStore();
  const [showPagination, setShowPagination] = useState(false);

  const { data, isLoading, isError } = useEmployeeQuery({
    currentPage,
    pageSize,
    dateRange: {
      startDate: dateRange[0],
      endDate: dateRange[1],
    },
    searchTerm: search,
    type: type as any,
    enabled: filteredEmployees?.length === 0,
  });

  console.log("Employee Table - Fetched Data:", data);

  let employees = filteredEmployees;
  let totalEmployeeCount = totalEmployees;
  if (filteredEmployees?.length === 0 && data && data?.employees.length > 0) {
    employees = data.employees as UserWithSalaryHistory;
    totalEmployeeCount = data?.totalEmployees || 0;
  }

  useEffect(() => {
    setPaginate({ currentPage: 1 });
  }, [type, search, dateRange[0], dateRange[1]]);

  useEffect(() => {
    if (totalEmployeeCount > defaultPageSize) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [totalEmployeeCount]);

  // useEffect(() => {
  //   const fetchedEmployees = async () => {
  //     try {
  //       const companyId = await getCompanyId();
  //       const response = await getEmployeesForPaginate({
  //         companyId,
  //         page: currentPage,
  //         take: pageSize,
  //         filter: {
  //           type: type !== "All" ? (type as any) : undefined,
  //           searchParams: search || undefined,
  //           dateRange:
  //             dateRange[0] && dateRange[1]
  //               ? { startDate: dateRange[0], endDate: dateRange[1] }
  //               : undefined,
  //         },
  //       });
  //       const { employees, totalEmployees } = response || {};
  //       console.log("Fetched Employees:", employees);
  //       setEmployees(employees as UserWithSalaryHistory);
  //       setTotalEmployeeCount(totalEmployees);
  //     } catch (error) {
  //       console.error("Error fetching employees for pagination:", error);
  //     }
  //   };
  //   fetchedEmployees();
  // }, [pageSize, currentPage, type, search, dateRange[0], dateRange[1]]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setPaginate({ currentPage: page });
    if (pageSize) {
      setPaginate({ pageSize: pageSize });
    }
  };
  let content = null;
  if (isLoading && !isError) {
    content = <div>Loading employees...</div>;
  } else if (isError && !isLoading) {
    content = <div>Error loading employees.</div>;
  } else if (!isError && !isLoading && employees.length === 0) {
    content = <div>No employees found.</div>;
  } else {
    // continue to render the table
    content = (
      <div className="app-shadow hidden overflow-x-auto rounded-lg bg-background p-2 lg:block">
        <table className="w-full">
          <thead>
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Employee ID</th>
              <th className="border-b px-4 py-2 text-left">Name </th>
              {needCompanyName && (
                <th className="border-b px-4 py-2 text-left">Company </th>
              )}
              <th className="border-b px-4 py-2 text-left">Email</th>
              <th className="border-b px-4 py-2 text-left">Phone</th>
              <th className="border-b px-4 py-2 text-left">Joined</th>
              <th className="border-b px-4 py-2 text-center">Type</th>
              <th className="border-b px-4 py-2 text-center">Edit</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee: any, index: number) => (
              <tr
                key={index}
                className={cn(
                  index % 2 === 0 ? "bg-background" : "bg-blue-100"
                )}
              >
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full text-blue-500"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {padId(employee.id)}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {employee.firstName} {employee.lastName}
                  </Link>
                </td>
                {needCompanyName && (
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full hover:underline hover:text-blue-500"
                      href={`/awx-dashboard/statistics/${employee.id}`}
                    >
                      {employee?.companyName}
                    </Link>
                  </td>
                )}
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {employee.email}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {employee.phone}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {employee.joinDate
                      ? moment(employee.joinDate).format("MM/DD/YYYY")
                      : "N/A"}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-center">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/employee/${employee.id}?view=details`}
                  >
                    {employee.employeeType}
                  </Link>
                </td>
                <td className="border-b border-l bg-background px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <EditEmployee employee={employee} />
                    <DeleteEmployee employee={employee} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {employees.map((employee, index) => (
          <ResponsiveEmployeeCard key={index} data={employee} index={index} />
        ))}
      </div>
      {content}
      {showPagination && (
        <div className="mt-4 pb-6 lg:pb-0 flex justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={totalEmployeeCount}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
};

export default EmployeeTable;
