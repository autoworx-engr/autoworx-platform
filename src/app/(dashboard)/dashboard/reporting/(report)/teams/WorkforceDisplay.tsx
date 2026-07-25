"use client";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Prisma, User } from "@prisma/client";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import WorkforceMobileCard from "./WorkforceMobileCard";

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
  formattedStartDate: any;
  formattedEndDate: any;
  page?: number;
  take?: number;
};

export default function WorkforceDisplay({
  employees,
  formattedEndDate,
  formattedStartDate,
  hasDateRange,
  page,
  take,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });

  const [currentPage, setCurrentPage] = useState(page ?? 1);
  const [pageSize, setPageSize] = useState(take ?? 50); // Default page size set to 50
  const [showPagination, setShowPagination] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search");
  const pathname = usePathname();

  useEffect(() => {
    setCurrentPage(page ?? 1);
  }, [page]);

  useEffect(() => {
    setPageSize(take ?? 50);
  }, [take]);

  useEffect(() => {
    if (employees.length > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [employees]);

  const handlePageChange = (page: number, pageSize?: number) => {
    const searchParams = new URLSearchParams(params.toString());
    setCurrentPage(page);
    searchParams.set("page", page.toString());
    if (pageSize) {
      setPageSize(pageSize);
      searchParams.set("take", pageSize.toString());
    } else {
      searchParams.delete("take");
    }

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = currentPage * pageSize;

  const paginatedEmployees = search
    ? employees
    : employees.slice(startIndex, endIndex);

  if (isDesktop) {
    return (
      <div className="hidden md:block pt-2">
        <div className="relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div className="max-h-[60vh] overflow-auto custom-scrollbar">
            {paginatedEmployees.length === 0 ? (
              <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                {/* Ghost Icon Illustration */}
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
                  <Search
                    size={24}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />
                  {/* Decorative ripple effect */}
                  <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
                </div>

                {/* Text Content */}
                <h3 className="mb-2 text-lg font-bold text-slate-500">
                  No Results Found
                </h3>
                <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
                  We couldn't find what you're looking for. Try adjusting your
                  filters or search terms.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="h-10 border-b">
                    <th className="px-4 py-2 text-left">Employee</th>
                    <th className="px-4 py-2 text-left">Employee Type</th>
                    <th className="px-4 py-2 text-left">Total Payout</th>
                    <th className="px-4 py-2 text-left">Attendance</th>
                    <th className="px-4 py-2 text-left"># Jobs Completed</th>
                    <th className="px-4 py-2 text-left">Completion Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee, index) => {
                    const jobsCompleted: number = employee.Technician?.reduce(
                      (acc, cur) => {
                        const techDate = cur.dateClosed
                          ? moment(cur.dateClosed).utc()
                          : null;
                        // console.log('techDate', techDate);
                        const isDateValid =
                          !hasDateRange ||
                          (techDate &&
                            techDate.isSameOrAfter(formattedStartDate) &&
                            techDate.isSameOrBefore(formattedEndDate));

                        if (cur.status === "Complete" && isDateValid) {
                          return acc + 1;
                        }

                        return acc;
                      },
                      0,
                    );

                    const totalPayout = employee.Technician.reduce(
                      (sum, tech) => {
                        const techDate = tech.dateClosed
                          ? moment(tech.dateClosed)
                          : null;

                        const isDateValid =
                          !hasDateRange ||
                          (techDate &&
                            techDate.isSameOrAfter(formattedStartDate) &&
                            techDate.isSameOrBefore(formattedEndDate));

                        if (tech.status === "Complete" && isDateValid) {
                          return sum + Number(tech?.amount || 0);
                        }

                        return sum;
                      },
                      0,
                    );

                    // Get the latest completion date
                    const latestCompletionDate = employee.Technician.filter(
                      (tech) => tech.status === "Complete" && tech.dateClosed,
                    )
                      .map((tech) => moment(tech.dateClosed))
                      .sort((a, b) => b.diff(a))[0];

                    return (
                      <tr
                        key={employee.id}
                        className={cn(
                          "cursor-pointer py-3 duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
                        )}
                      >
                        <td className="px-4 py-2 text-left hover:text-blue-500">
                          <Link
                            href={`/dashboard/employee/${employee.id}?view=details`}
                          >
                            {employee.firstName} {employee.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-left">
                          {employee.employeeType}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {formatCurrency(totalPayout)}
                        </td>
                        <td className="px-4 py-2 text-left"></td>
                        <td className="px-4 py-2 text-left">{jobsCompleted}</td>
                        <td className="px-4 py-2 text-left">
                          {latestCompletionDate
                            ? moment(latestCompletionDate).format("MM/DD/YYYY")
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {showPagination && (
            <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
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
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4 md:hidden">
        {paginatedEmployees.map((employee, index) => (
          <WorkforceMobileCard
            key={employee.id}
            employee={employee}
            index={index}
            formattedEndDate={formattedEndDate}
            formattedStartDate={formattedStartDate}
            hasDateRange={hasDateRange}
          />
        ))}
      </div>

      {/* Mobile Pagination */}
      {showPagination && (
        <div className="mt-4 flex justify-center pb-4 md:hidden">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={employees.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            simple
          />
        </div>
      )}
    </div>
  );
}
