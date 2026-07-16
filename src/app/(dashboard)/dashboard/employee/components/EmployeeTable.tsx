"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { SalaryHistory, User } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { UserIcon } from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import useEmployeeQuery from "../_hook/useEmployeeQuery";
import DeleteEmployee from "../DeleteEmployee";
import EditEmployee from "../EditEmployee";
import { EmployeeTableSkeleton } from "./EmployeeTableSkeleton";
import { useSession } from "next-auth/react";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

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
    content = <EmployeeTableSkeleton />;
  } else if (isError && !isLoading) {
    content = <div>Error loading employees.</div>;
  } else if (!isError && !isLoading && employees.length === 0) {
    content = <div>No employees found.</div>;
  } else {
    // continue to render the table
    content = (
      <div className="hidden lg:block rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div className="hidden lg:block overflow-hidden rounded-xl p-2 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div className="md:overflow-x-auto max-h-[65vh] overflow-y-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0  bg-background">
                <tr className="h-10">
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
                {employees.map((employee: any, index: number) => {
                  const isAdmin = currentUser?.employeeType === "Admin";
                  const isManager = currentUser?.employeeType === "Manager";
                  const isSelf =
                    currentUser?.id && Number(currentUser.id) === employee.id;
                  const isTargetAdmin = employee.employeeType === "Admin";
                  // Edit permission logic
                  const canEdit =
                    isAdmin || (isManager && !isTargetAdmin) || isSelf;
                  // Delete permission logic
                  const canDelete =
                    isAdmin || (isManager && !isTargetAdmin && !isSelf);

                  return (
                    <tr
                      key={index}
                      className={cn(
                        " duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        index % 2 !== 0
                          ? "bg-blue-50/80 dark:bg-slate-900"
                          : "bg-white dark:bg-slate-900",
                      )}
                    >
                      <td className="border-b px-4 py-2 text-left">
                        <Link
                          className="block h-full w-full text-blue-400"
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          {padId(employee.id)}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-2 text-left">
                        <Link
                          className="h-full w-full flex items-center gap-3 group "
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-primary/80 ring-1 ring-indigo-100 dark:ring-indigo-900/30">
                            <UserIcon size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-500 dark:text-slate-200 transition-colors">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </div>
                        </Link>
                      </td>
                      {needCompanyName && (
                        <td className="border-b px-4 py-2 text-left">
                          <Link
                            className="block h-full w-full hover:underline hover:text-blue-500 text-slate-500 font-normal"
                            href={`/awx-dashboard/statistics/${employee.id}`}
                          >
                            {employee?.companyName}
                          </Link>
                        </td>
                      )}
                      <td className="border-b px-4 py-2 text-left">
                        <Link
                          className="block h-full w-full text-slate-500 font-normal"
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          {employee.email}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-2 text-left">
                        <Link
                          className="block h-full w-full text-slate-500 font-normal"
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          {employee.phone}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-2 text-left">
                        <Link
                          className="block h-full w-full text-slate-500 font-normal"
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          {employee.joinDate
                            ? moment.utc(employee.joinDate).format("MM/DD/YYYY")
                            : "N/A"}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-2 text-center">
                        <Link
                          className="block h-full w-full text-slate-500 font-normal"
                          href={`/dashboard/employee/${employee.id}?view=details`}
                        >
                          {employee.employeeType}
                        </Link>
                      </td>
                      <td className="border-b border-l bg-background px-4 py-2 text-center">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-slate-50 dark:bg-slate-950 min-h-[500px]">
      <div className="mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Team Members{" "}
            <span className="text-slate-400 font-normal">
              ({totalEmployeeCount})
            </span>
          </h3>
          {/* Pagination placeholder if needed up top */}
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          {employees.map((employee: any, index: number) => (
            <ResponsiveEmployeeCard key={index} data={employee} index={index} />
          ))}
        </div>

        {/* Desktop View */}
        {content}

        {/* Pagination */}
        {(showPagination || true) && ( // Force true for demo
          <div className="flex justify-end">
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
  );
};

export default EmployeeTable;
