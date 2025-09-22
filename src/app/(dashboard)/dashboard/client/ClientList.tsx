"use client";

import { Client, Source, Tag } from "@prisma/client";
import React, { useEffect, useState } from "react";
import { useClientFilterStore } from "@/stores/clientFilter";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import ClientListTable from "./ClientListTable";
import { padId } from "@/lib/padId";
// import * as PusherPushNotifications from "@pusher/push-notifications-web";

export default function ClientList({
  clients,
  needCompanyName = false,
}: {
  clients: (Client & { tag: Tag | null; source: Source | null })[];
  needCompanyName?: boolean;
}) {
  const randomIds: { [key: number]: string } = {};
  const { search } = useClientFilterStore();
  const [filteredClients, setFilteredClients] = useState(clients);

  useEffect(() => {
    const searchWords = (search || "").toLowerCase().trim().split(/\s+/);

    setFilteredClients(
      clients.filter((client: any) => {
        const fullName =
          `${client.firstName || ""} ${client.lastName || ""}`.toLowerCase();
        const email = client?.email?.toLowerCase() || "";
        const mobile = client?.mobile?.toLowerCase() || "";
        const id = padId(client.id);

        return searchWords.every(
          (word) =>
            id.includes(word) ||
            fullName.includes(word) ||
            email.includes(word) ||
            mobile.includes(word)
        );
      })
    );
  }, [search, clients]);

  return (
    <div>
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {filteredClients.map((employee, index) => (
          <ResponsiveEmployeeCard key={index} data={employee} index={index} />
        ))}
      </div>

      <ClientListTable
        filteredClients={filteredClients}
        randomIds={randomIds}
        needCompanyName={needCompanyName}
      />
    </div>
  );
}
