"use client";

import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { useClientFilterStore } from "@/stores/clientFilter";
import { Client, Source, Tag } from "@prisma/client";
import moment from "moment";
import Link from "next/link";
import DeleteClient from "./DeleteClient";
import EditClient from "./EditClient";

type TClientListTable = {
  clients: (Client & { tag: Tag | null; source: Source | null })[];
  needCompanyName?: boolean;
};

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

const ClientListTable = ({
  clients,
  needCompanyName = false,
}: TClientListTable) => {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 bg-white shadow-sm">
        <tr className="h-10 border-b">
          <th className="px-4 py-2 text-left">Client ID</th>
          <th className="px-4 py-2 text-left">Client </th>
          <th className="px-4 py-2 text-left">Email</th>
          <th className="px-4 py-2 text-left">Phone</th>
          {needCompanyName && <th className="px-4 py-2 text-left">Company</th>}
          <th className="px-4 py-2 text-left">Date Joined</th>
          <th className="px-4 py-2 text-center">Edit</th>
        </tr>
      </thead>

      <tbody>
        {clients.map((client: any, index: number) => (
          <tr
            key={index}
            className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
          >
            <td className="px-4 py-2 text-left">
              <Link
                className="text-blue-400"
                href={`/dashboard/client/${client.id}`}
              >
                {padId(client.id)}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500 font-medium"
                href={`/dashboard/client/${client.id}`}
              >
                {client.firstName} {client.lastName}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full"
                href={`/dashboard/client/${client.id}`}
              >
                {client.email}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full"
                href={`/dashboard/client/${client.id}`}
              >
                {client.mobile}
              </Link>
            </td>
            {needCompanyName && (
              <td className="px-4 py-2 text-left">
                <Link
                  className="block h-full w-full hover:underline hover:text-blue-500 "
                  href={`/awx-dashboard/statistics/${client?.companyId}`}
                >
                  {client?.company.name}
                </Link>
              </td>
            )}
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500"
                href={`/dashboard/client/${client.id}`}
              >
                {moment(
                  client?.joinDate ? client.joinDate : client.createdAt,
                ).format("MM/DD/YYYY")}
              </Link>
            </td>
            <td className="px-4 py-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <EditClient client={client} />
                <DeleteClient id={client.id} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ClientListTable;
