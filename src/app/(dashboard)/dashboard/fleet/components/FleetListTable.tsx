"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import DeleteFleet from "./DeleteFleet";
import NewFleet from "@/app/(dashboard)/dashboard/fleet/components/NewFleet";
import { padId } from "@/lib/padId";
import { SquarePen } from "lucide-react";

const FleetListTable = ({ filteredFleets }: { filteredFleets: any }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
    <div className="app-shadow hidden w-full overflow-x-auto rounded-lg bg-background p-3 lg:block">
      <table className="w-full">
        <thead className="">
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
                "py-3",
                index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
              )}
            >
              <td className="border-b px-4 py-2 text-left">
                <Link
                  className="text-blue-500"
                  href={`/dashboard/fleet/${client.id}`}
                >
                  {client.id}
                </Link>
              </td>
              <td className="border-b px-4 py-2 text-left">
                <Link
                  className="block h-full w-full"
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
  );
};

export default FleetListTable;
