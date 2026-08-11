"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { SalaryHistory, User } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { Search } from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import useEmployeeQuery from "../_hook/useEmployeeQuery";
import DeleteEmployee from "../DeleteEmployee";
import EditEmployee from "../EditEmployee";
import { EmployeeTableSkeleton } from "./EmployeeTableSkeleton";
import { useSession } from "next-auth/react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import Avatar from "@/components/Avatar";

const defaultPageSize = 20;
const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

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
  const sessionUser = useSession();
  const currentUser = sessionUser.data?.user;
  const timezone = useCompanyTimezone();

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

  const handlePageChange = (page: number, pageSize?: number) => {
    setPaginate({ currentPage: page });
    if (pageSize) {
      setPaginate({ pageSize: pageSize });
    }
  };

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]">
      <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Team Members{" "}
            <span className="text-slate-400 font-normal">
              ({totalEmployeeCount})
            </span>
          </h3>
        </div>

        <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
          <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Mobile View */}
            <div className="lg:hidden space-y-4">
              {isLoading ? (
                <EmployeeTableSkeleton />
              ) : isError ? (
                <div>Error loading employees.</div>
              ) : employees.length === 0 ? (
                <EmptyState />
              ) : (
                employees.map((employee: any, index: number) => {
                  const isAdmin = currentUser?.employeeType === "Admin";
                  const isManager = currentUser?.employeeType === "Manager";
                  const isSelf =
                    currentUser?.id && Number(currentUser.id) === employee.id;
                  const isTargetAdmin = employee.employeeType === "Admin";
                  const canEdit =
                    isAdmin || (isManager && !isTargetAdmin) || isSelf;
                  const canDelete =
                    isAdmin || (isManager && !isTargetAdmin && !isSelf);

                  return (
                    <ResponsiveEmployeeCard
                      key={index}
                      data={employee}
                      index={index}
                      actions={
                        (canEdit || canDelete) && (
                          <>
                            {canEdit && <EditEmployee employee={employee} />}
                            {canDelete && (
                              <DeleteEmployee employee={employee} />
                            )}
                          </>
                        )
                      }
                    />
                  );
                })
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              {isLoading ? (
                <EmployeeTableSkeleton />
              ) : isError ? (
                <div className="p-6 text-center text-slate-500">
                  Error loading employees.
                </div>
              ) : employees.length === 0 ? (
                <EmptyState />
              ) : (
                <DesktopTable
                  employees={employees}
                  needCompanyName={needCompanyName}
                  currentUser={currentUser}
                  timezone={timezone}
                />
              )}
            </div>
          </div>

          {showPagination && (
            <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
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
        </div>
      </div>
    </div>
  );
};

function EmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Search size={24} className="text-slate-300" strokeWidth={1.5} />
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">
        No Results Found
      </h3>
      <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
        We couldn&apos;t find what you&apos;re looking for. Try adjusting your
        filters or search terms.
      </p>
    </div>
  );
}

function DesktopTable({
  employees,
  needCompanyName,
  currentUser,
  timezone,
}: {
  employees: any[];
  needCompanyName: boolean;
  currentUser: any;
  timezone: string;
}) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 bg-white shadow-sm">
        <tr className="h-10 border-b">
          <th className="px-4 py-2 text-left">Employee ID</th>
          <th className="px-4 py-2 text-left">Name </th>
          {needCompanyName && <th className="px-4 py-2 text-left">Company </th>}
          <th className="px-4 py-2 text-left">Email</th>
          <th className="px-4 py-2 text-left">Phone</th>
          <th className="px-4 py-2 text-left">Joined</th>
          <th className="px-4 py-2 text-center">Type</th>
          <th className="px-4 py-2 text-center">Edit</th>
        </tr>
      </thead>

      <tbody>
        {employees.map((employee: any, index: number) => {
          const isAdmin = currentUser?.employeeType === "Admin";
          const isManager = currentUser?.employeeType === "Manager";
          const isSelf =
            currentUser?.id && Number(currentUser.id) === employee.id;
          const isTargetAdmin = employee.employeeType === "Admin";
          // Edit permission logic
          const canEdit = isAdmin || (isManager && !isTargetAdmin) || isSelf;
          // Delete permission logic
          const canDelete = isAdmin || (isManager && !isTargetAdmin && !isSelf);

          return (
            <tr
              key={index}
              className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
            >
              <td className="px-4 py-2 text-left">
                <Link
                  className="block h-full w-full text-blue-400"
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  {padId(employee.id)}
                </Link>
              </td>
              <td className="px-4 py-2 text-left">
                <Link
                  className="h-full w-full flex items-center gap-3 group "
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  <div className="rounded-full  bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                    <Avatar photo={employee.image} width={44} height={44} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-500 dark:text-slate-200 transition-colors">
                      {employee.firstName} {employee.lastName}
                    </div>
                  </div>
                </Link>
              </td>
              {needCompanyName && (
                <td className="px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full hover:underline hover:text-blue-500 text-slate-500 font-normal"
                    href={`/awx-dashboard/statistics/${employee.id}`}
                  >
                    {employee?.companyName}
                  </Link>
                </td>
              )}
              <td className="px-4 py-2 text-left">
                <Link
                  className="block h-full w-full text-slate-500 font-normal"
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  {employee.email}
                </Link>
              </td>
              <td className="px-4 py-2 text-left">
                <Link
                  className="block h-full w-full text-slate-500 font-normal"
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  {employee.phone}
                </Link>
              </td>
              <td className="px-4 py-2 text-left">
                <Link
                  className="block h-full w-full text-slate-500 font-normal"
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  {employee.joinDate
                    ? moment.utc(employee.joinDate).format("MM/DD/YYYY")
                    : "N/A"}
                </Link>
              </td>
              <td className="px-4 py-2 text-center">
                <Link
                  className="block h-full w-full text-slate-500 font-normal"
                  href={`/dashboard/employee/${employee.id}?view=details`}
                >
                  {employee.employeeType}
                </Link>
              </td>
              <td className="px-4 py-2 flex items-center justify-center">
                <div className="flex items-center justify-start gap-2 flex-shrink-0">
                  {canEdit && <EditEmployee employee={employee} />}
                  {canDelete && <DeleteEmployee employee={employee} />}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default EmployeeTable;
