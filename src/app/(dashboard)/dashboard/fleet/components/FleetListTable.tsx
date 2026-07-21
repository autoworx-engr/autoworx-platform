"use client";

import NewFleet from "@/app/(dashboard)/dashboard/fleet/components/NewFleet";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import DeleteFleet from "./DeleteFleet";

type TFleetListTableProps = {
  fleets?: any[];
};

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

const FleetListTable = ({ fleets }: TFleetListTableProps) => {
  const rows = fleets ?? [];

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 bg-white shadow-sm">
        <tr className="h-10 border-b">
          <th className="px-4 py-2 text-left">Fleet ID</th>
          <th className="px-4 py-2 text-left">Fleet Name</th>
          <th className="px-4 py-2 text-left">Contact Name</th>
          <th className="px-4 py-2 text-left">Email</th>
          <th className="px-4 py-2 text-left">Phone</th>
          <th className="px-4 py-2 text-center">Edit</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((client: any, index: number) => (
          <tr
            key={index}
            className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
          >
            <td className="px-4 py-2 text-left">
              <Link
                className="text-blue-400"
                href={`/dashboard/fleet/${client.id}`}
              >
                {padId(client.id)}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500 font-medium"
                href={`/dashboard/fleet/${client.id}`}
              >
                {client.fleet?.fleetName}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500 font-normal"
                href={`/dashboard/fleet/${client.id}`}
              >
                {client.fleet?.contactName}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500 font-normal"
                href={`/dashboard/fleet/${client.id}`}
              >
                {client.email}
              </Link>
            </td>
            <td className="px-4 py-2 text-left">
              <Link
                className="block h-full w-full text-slate-500 font-normal"
                href={`/dashboard/fleet/${client.id}`}
              >
                {client.mobile}
              </Link>
            </td>
            <td className="px-4 py-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <NewFleet
                  fleet={client}
                  isEdit={true}
                  buttonElement={
                    <SquarePen className="w-5 h-5 cursor-pointer text-[#6571ff]" />
                  }
                />
                <DeleteFleet id={client.fleet?.clientId} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FleetListTable;
