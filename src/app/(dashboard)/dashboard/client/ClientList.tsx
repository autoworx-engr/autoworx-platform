"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { useClientFilterStore } from "@/stores/clientFilter";
import useClientQuery from "./_hook/useClientQuery";
import ClientListTable from "./ClientListTable";
import { ClientTableSkeleton } from "./ClientTableSkeleton";
import { Client, Source, Tag } from "@prisma/client";

export default function ClientList({
  clients = [],
  needCompanyName = false,
}: {
  needCompanyName?: boolean;
  clients?: (Client & { tag: Tag | null; source: Source | null })[];
}) {
  const { search, currentPage, pageSize } = useClientFilterStore();
  const { data, isLoading, isError } = useClientQuery({
    search,
    currentPage,
    pageSize,
    enabled: clients.length === 0,
  });

  let clientData = clients;
  let totalClients = clients?.length;
  if (clientData.length === 0 && data) {
    clientData = data.clients;
    totalClients = data?.totalClients || 0;
  }

  let content;
  if (isLoading && !isError) {
    content = <ClientTableSkeleton />;
  } else if (isError && !isLoading) {
    content = <div>Error loading clients.</div>;
  } else if (!isError && !isLoading && clients.length === 0) {
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
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {clients.map((employee, index) => (
          <ResponsiveEmployeeCard key={index} data={employee} index={index} />
        ))}
      </div>

      {content}
    </div>
  );
}
