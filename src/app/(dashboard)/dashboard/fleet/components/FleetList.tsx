"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Client, Fleet, Source, Tag } from "@prisma/client";
import { useEffect, useState } from "react";
import FleetListTable from "./FleetListTable";
// import * as PusherPushNotifications from "@pusher/push-notifications-web";

export default function FleetList({
  clients,
}: {
  clients: (Client & {
    tag: Tag | null;
    source: Source | null;
    fleet: Fleet | null;
  })[];
}) {
  const { search } = useClientFilterStore();
  const [filteredClients, setFilteredClients] = useState(clients);

  useEffect(() => {
    const term = search.toLowerCase().replace(/\s+/g, " ");
    setFilteredClients(
      clients.filter((client) => {
        const fullName = `${client.firstName} ${client.lastName || ""}`
          .toLowerCase()
          .replace(/\s+/g, " ");

        return (
          client.id.toString().includes(term) ||
          fullName.includes(term) ||
          client.firstName.toLowerCase().includes(term) ||
          (client.lastName?.toLowerCase().includes(term) ?? false) ||
          (client.email?.toLowerCase().includes(term) ?? false) ||
          (client.mobile?.toLowerCase().includes(term) ?? false)
        );
      })
    );
  }, [search, clients]);

  return (
    <div>
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {filteredClients.map((employee, index) => (
          <ResponsiveEmployeeCard
            key={index}
            data={employee}
            isFleet={true}
            index={index}
          />
        ))}
      </div>

      <FleetListTable filteredFleets={filteredClients} />
    </div>
  );
}
