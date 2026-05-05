"use client";

import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Client, Source, Tag } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import Link from "next/link";
import DeleteClient from "./DeleteClient";
import EditClient from "./EditClient";

type TClientListTable = {
  clients: (Client & { tag: Tag | null; source: Source | null })[];
  needCompanyName?: boolean;
  totalClients?: number;
};

const ClientListTable = ({
  clients,
  needCompanyName = false,
  totalClients = 0,
}: TClientListTable) => {
  const { currentPage, setCurrentPage, pageSize, setPageSize } =
    useClientFilterStore();

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page ?? 0);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const showPagination = totalClients > pageSize;

  return (
    <div className="hidden lg:block rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden p-2">
      <div className="max-h-[70vh] overflow-y-auto overflow-x-auto thin-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Client ID</th>
              <th className="border-b px-4 py-2 text-left">Client </th>
              <th className="border-b px-4 py-2 text-left">Email</th>
              <th className="border-b px-4 py-2 text-left">Phone</th>
              {needCompanyName && (
                <th className="border-b px-4 py-2 text-left">Company</th>
              )}
              <th className="border-b px-4 py-2 text-center">Edit</th>
            </tr>
          </thead>

          <tbody>
            {clients.map((client: any, index: number) => (
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
                    className="text-blue-400"
                    href={`/dashboard/client/${client.id}`}
                  >
                    {padId(client.id)}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full text-slate-500 font-medium"
                    href={`/dashboard/client/${client.id}`}
                  >
                    {client.firstName} {client.lastName}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/client/${client.id}`}
                  >
                    {client.email}
                  </Link>
                </td>
                <td className="border-b px-4 py-2 text-left">
                  <Link
                    className="block h-full w-full"
                    href={`/dashboard/client/${client.id}`}
                  >
                    {client.mobile}
                  </Link>
                </td>
                {needCompanyName && (
                  <td className="border-b px-4 py-2 text-left">
                    <Link
                      className="block h-full w-full hover:underline hover:text-blue-500 "
                      href={`/awx-dashboard/statistics/${client?.companyId}`}
                    >
                      {client?.company.name}
                    </Link>
                  </td>
                )}
                <td className="border-b border-l bg-background px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <EditClient client={client} />
                    <DeleteClient id={client.id} />
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
              total={totalClients ?? 0}
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

export default ClientListTable;
