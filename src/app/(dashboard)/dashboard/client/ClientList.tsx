"use client";

import { cn } from "@/lib/cn";
import { Client, Source, Tag } from "@prisma/client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import DeleteClient from "./DeleteClient";
import EditClient from "./EditClient";
import { useClientFilterStore } from "@/stores/clientFilter";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import ClientListTable from "./ClientListTable";
import { generateRandomId } from "@/utils/randomNumber";
// import * as PusherPushNotifications from "@pusher/push-notifications-web";

export default function ClientList({
  clients,
}: {
  clients: (Client & { tag: Tag | null; source: Source | null })[];
}) {
  const { search } = useClientFilterStore();
  const [filteredClients, setFilteredClients] = useState(clients);
  const [randomIds, setRandomIds] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const ids = filteredClients.reduce(
      (acc, employee) => {
        acc[employee.id] = generateRandomId();
        return acc;
      },
      {} as { [key: number]: string },
    );
    setRandomIds(ids);
  }, [filteredClients]);

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
            index={index}
            randomIds={randomIds}
          />
        ))}
      </div>

      <ClientListTable
        filteredClients={filteredClients}
        randomIds={randomIds}
      />
    </div>
  );
}
