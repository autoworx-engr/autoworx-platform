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
    <div className="app-shadow hidden w-full overflow-x-auto rounded-lg bg-background p-3 lg:block">
      <table className="w-full">
        <thead className="">
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
                "py-3",
                index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
              )}
            >
              <td className="border-b px-4 py-2 text-left">
                <Link
                  className="text-blue-500"
                  href={`/dashboard/client/${client.id}`}
                >
                  {padId(client.id)}
                </Link>
              </td>
              <td className="border-b px-4 py-2 text-left">
                <Link
                  className="block h-full w-full"
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
  );
};

export default ClientListTable;
