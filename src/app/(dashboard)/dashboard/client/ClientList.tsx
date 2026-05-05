"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Client, Source, Tag } from "@prisma/client";
import { Pagination } from "antd";
import useClientQuery from "./_hook/useClientQuery";
import ClientListTable from "./ClientListTable";
import { ClientCardSkeleton, ClientTableSkeleton } from "./ClientTableSkeleton";

export default function ClientList({
  clients = [],
  needCompanyName = false,
}: {
  needCompanyName?: boolean;
  clients?: (Client & { tag: Tag | null; source: Source | null })[];
}) {
  const { search, currentPage, pageSize, setCurrentPage, setPageSize } =
    useClientFilterStore();
  const { data, isLoading, isError } = useClientQuery({
    search,
    currentPage,
    pageSize,
    enabled: clients?.length === 0,
  });

  let clientData = clients;
  let totalClients = clients?.length;
  if (clients.length === 0 && data && data?.clients.length > 0) {
    clientData = data.clients;
    totalClients = data?.totalClients || 0;
  }

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page ?? 0);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const showPagination = totalClients > pageSize;

  let content;
  if (isLoading && !isError) {
    content = <ClientTableSkeleton />;
  } else if (isError && !isLoading) {
    content = <div>Error loading clients.</div>;
  } else if (!isError && !isLoading && clientData.length === 0) {
    content = <div>No clients found.</div>;
  } else {
    content = (
      <ClientListTable
        clients={clientData}
        needCompanyName={needCompanyName}
        totalClients={totalClients}
      />
    );
  }

  return (
    <div>
      {/* Mobile View */}
      <div className="lg:hidden">
        <div className="h-[60%] overflow-y-auto">
          {isLoading ? (
            <ClientCardSkeleton />
          ) : isError ? (
            <p className="px-4 py-6 text-center text-sm text-red-500">
              Error loading clients.
            </p>
          ) : clientData.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No clients found.
            </p>
          ) : (
            clientData.map((employee, index) => (
              <ResponsiveEmployeeCard
                key={index}
                data={employee}
                index={index}
              />
            ))
          )}
        </div>

        {/* Mobile Pagination */}
        {showPagination && (
          <div className="my-2 flex justify-center">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={totalClients ?? 0}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
              simple // Optional: use simple pagination for mobile
            />
          </div>
        )}
      </div>

      {/* Desktop View */}
      {content}
    </div>
  );
}
