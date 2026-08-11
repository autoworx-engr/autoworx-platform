"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Client, Source, Tag } from "@prisma/client";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import useClientQuery from "./_hook/useClientQuery";
import ClientListTable from "./ClientListTable";
import { ClientCardSkeleton, ClientTableSkeleton } from "./ClientTableSkeleton";
import DeleteClient from "./DeleteClient";
import EditClient from "./EditClient";

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

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]">
      <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Clients{" "}
            <span className="text-slate-400 font-normal">({totalClients})</span>
          </h3>
        </div>

        <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
          <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Mobile View */}
            <div className="lg:hidden space-y-4">
              {isLoading ? (
                <ClientCardSkeleton />
              ) : isError ? (
                <p className="px-4 py-6 text-center text-sm text-red-500">
                  Error loading clients.
                </p>
              ) : clientData.length === 0 ? (
                <EmptyState />
              ) : (
                clientData.map((employee, index) => (
                  <ResponsiveEmployeeCard
                    key={index}
                    data={employee}
                    index={index}
                    actions={
                      <>
                        <EditClient client={employee as any} />
                        <DeleteClient id={employee.id} />
                      </>
                    }
                  />
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              {isLoading ? (
                <ClientTableSkeleton />
              ) : isError ? (
                <div className="p-6 text-center text-slate-500">
                  Error loading clients.
                </div>
              ) : clientData.length === 0 ? (
                <EmptyState />
              ) : (
                <ClientListTable
                  clients={clientData}
                  needCompanyName={needCompanyName}
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
                total={totalClients ?? 0}
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
}

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
