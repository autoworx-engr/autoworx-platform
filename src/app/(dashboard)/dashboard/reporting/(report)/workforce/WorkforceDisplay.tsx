"use client";
import { useMediaQuery } from "react-responsive";
import { User, Prisma } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import WorkforceMobileCard from "./WorkforceMobileCard";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { useEffect, useState } from "react";

type TProps = {
  employees: (User & {
    Technician: {
      id: number;
      status: string | null;
      amount: Prisma.Decimal | null;
      dateClosed: Date | null;
    }[];
  })[];
  hasDateRange: boolean;
  formattedStartDate: Date | null;
  formattedEndDate: Date | null;
};

export default function WorkforceDisplay({
  employees,
  formattedEndDate,
  formattedStartDate,
  hasDateRange,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default page size set to 50
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    if (employees.length > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [employees]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedEmployees = employees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (isDesktop) {
    return (
      <div className="hidden md:block">
        <table className="w-full shadow-md">
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Employee</th>
              <th className="border-b px-4 py-2 text-left">Employee Type </th>
              <th className="border-b px-4 py-2 text-left">Total Payout</th>
              <th className="border-b px-4 py-2 text-left">Attendance</th>
              <th className="border-b px-4 py-2 text-left"># Jobs Completed</th>
              <th className="border-b px-4 py-2 text-left">Completion Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((employee, index) => {
              const jobsCompleted: number = employee.Technician?.reduce(
                (acc, cur) => {
                  const techDate = cur.dateClosed
                    ? new Date(cur.dateClosed)
                    : null;

                  const isDateValid =
                    !hasDateRange ||
                    (techDate !== null &&
                      techDate >= formattedStartDate! &&
                      techDate <= formattedEndDate!);

                  if (cur.status === "Complete" && isDateValid) {
                    return acc + 1;
                  }

                  return acc;
                },
                0,
              );

              const totalPayout = employee.Technician.reduce((sum, tech) => {
                const techDate = tech.dateClosed
                  ? new Date(tech.dateClosed)
                  : null;

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
              // Get the latest completion date
              const latestCompletionDate = employee.Technician?.filter(
                (tech) => tech.status === "Complete" && tech.dateClosed,
              )
                .filter((tech) => tech.dateClosed !== null)
                .map((tech) => new Date(tech.dateClosed!))
                .sort((a, b) => b.getTime() - a.getTime())[0];
              return (
                <tr
                  key={employee.id}
                  className={cn(
                    "cursor-pointer rounded-md py-3",
                    index % 2 === 0 ? "bg-background" : "bg-blue-100",
                  )}
                >
                  <td className="border-b px-4 py-2 text-left">
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {employee.employeeType}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {formatCurrency(totalPayout)}
                  </td>
                  <td className="border-b px-4 py-2 text-left"></td>
                  <td className={cn("border-b px-4 py-2 text-left")}>
                    {jobsCompleted}
                  </td>
                  <td className={cn("border-b px-4 py-2 text-left")}>
                    {latestCompletionDate
                      ? latestCompletionDate.toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {showPagination && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={employees.length}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:hidden">
      {employees.map((employee, index) => (
        <WorkforceMobileCard
          key={employee.id}
          employee={employee}
          index={index}
          formattedEndDate={formattedEndDate}
          formattedStartDate={formattedStartDate}
          hasDateRange={hasDateRange }
        />
      ))}
      {/* {showPagination && (
        <div className="mt-4 flex justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={employees.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )} */}
    </div>
  );
}
