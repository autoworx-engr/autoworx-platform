"use client";

import NewFleet from "@/app/(dashboard)/dashboard/fleet/components/NewFleet";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { Pagination } from "antd";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import DeleteFleet from "./DeleteFleet";

const FleetListTable = ({ filteredFleets }: { filteredFleets: any }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    if (filteredFleets.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredFleets]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedFleets = filteredFleets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden p-2">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 bg-background">
              <tr className="h-10 border-b">
                <th className="border-b px-4 py-2 text-left">Fleet ID</th>
                <th className="border-b px-4 py-2 text-left">Fleet Name</th>
                <th className="border-b px-4 py-2 text-left">Contact Name</th>
                <th className="border-b px-4 py-2 text-left">Email</th>
                <th className="border-b px-4 py-2 text-left">Phone</th>
                <th className="border-b px-4 py-2 text-center">Edit</th>
              </tr>
            </thead>

            <tbody>
              {paginatedFleets.map((client: any, index: number) => (
                <tr
                  key={index}
                  className={cn(
                    " duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    index % 2 !== 0
                      ? "bg-blue-50/80 dark:bg-slate-900"
                      : "bg-white dark:bg-slate-900"
                  )}
                >
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="text-blue-400"
                      href={`/dashboard/fleet/${client.id}`}
                    >
                      {padId(client.id)}
                    </Link>
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full text-slate-500 font-medium"
                      href={`/dashboard/fleet/${client.id}`}
                    >
                      {client.fleet.fleetName}
                    </Link>
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full"
                      href={`/dashboard/fleet/${client.id}`}
                    >
                      {client.fleet.contactName}
                    </Link>
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full"
                      href={`/dashboard/fleet/${client.id}`}
                    >
                      {client.email}
                    </Link>
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full"
                      href={`/dashboard/fleet/${client.id}`}
                    >
                      {client.mobile}
                    </Link>
                  </td>
                  <td className="border-b border-l bg-background px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <NewFleet
                        fleet={client}
                        isEdit={true}
                        buttonElement={
                          <SquarePen className="w-5 h-5 cursor-pointer text-[#6571ff]" />
                        }
                      />
                      <DeleteFleet id={client.fleet.clientId} />
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
                total={filteredFleets.length}
                onChange={handlePageChange}
                showSizeChanger
                onShowSizeChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {paginatedFleets.map((client: any, index: number) => (
          <div
            key={index}
            className="rounded-xl p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm"
          >
            <Link href={`/dashboard/fleet/${client.id}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Fleet ID
                  </span>
                  <span className="text-blue-400 font-semibold">
                    {padId(client.id)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Fleet Name
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {client.fleet.fleetName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Contact
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {client.fleet.contactName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Email
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 text-sm truncate max-w-[200px]">
                    {client.email}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Phone
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {client.mobile}
                  </span>
                </div>
              </div>
            </Link>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <NewFleet
                fleet={client}
                isEdit={true}
                buttonElement={
                  <SquarePen className="w-5 h-5 cursor-pointer text-[#6571ff]" />
                }
              />
              <DeleteFleet id={client.fleet.clientId} />
            </div>
          </div>
        ))}

        {showPagination && (
          <div className="my-2 flex justify-center">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={filteredFleets.length}
              onChange={handlePageChange}
              showSizeChanger={false}
              onShowSizeChange={handlePageChange}
              simple
            />
          </div>
        )}
      </div>
    </>
  );
};

export default FleetListTable;
