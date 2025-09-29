"use client";

import { cn } from "@/lib/cn";
import moment from "moment";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import EditEmployee from "../EditEmployee";
import DeleteEmployee from "../DeleteEmployee";
import { User } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { padId } from "@/lib/padId";

const EmployeeTable = ({
  filteredEmployees,
  randomIds,
  needCompanyName = false,
}: {
  filteredEmployees: User[];
  randomIds: { [key: number]: string };
  needCompanyName?: boolean;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    if (filteredEmployees.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredEmployees]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
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
          {paginatedEmployees.map((employee: any, index: number) => (
            <tr
              key={index}
              className={cn(index % 2 === 0 ? "bg-background" : "bg-blue-100")}
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
                  {employee.joinDate ? moment(employee.joinDate)
                    .format("MM/DD/YYYY") : "N/A"}
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

      {showPagination && (
        <div className="mt-4 flex justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={filteredEmployees.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default EmployeeTable;
