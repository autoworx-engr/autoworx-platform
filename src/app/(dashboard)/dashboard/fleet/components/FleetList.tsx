"use client";

import { Client, Fleet, Source, Tag } from "@prisma/client";
import React, { useEffect, useState } from "react";
import { useClientFilterStore } from "@/stores/clientFilter";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { generateRandomId } from "@/utils/randomNumber";
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
    setFilteredClients(
      clients.filter((client) => {
        return (
          client.id.toString().includes(search) ||
          client.firstName.toLowerCase().includes(search.toLowerCase()) ||
          client.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          client.email?.toLowerCase().includes(search.toLowerCase()) ||
          client.mobile?.toLowerCase().includes(search.toLowerCase())
        );
      }),
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
