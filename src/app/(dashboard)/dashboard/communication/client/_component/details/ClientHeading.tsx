import { db } from "@/lib/db";
import { Client, Vehicle, User } from "@prisma/client";
import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Edit } from "lucide-react";
import BackBtn from "../conversations/BackBtn";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { useState } from "react";
import EditClientModalTrigger from "./EditClientModalTrigger";

type TProps = { client?: Client | null; vehicles?: Partial<Vehicle>[] };

const VehicleDetails = dynamic(() => import("./VehicleDetails"), {
  ssr: false,
});
const CreateAppointment = dynamic(() => import("./CreateAppointment"), {
  ssr: false,
});

export default async function ClientHeading({ client, vehicles = [] }: TProps) {
  if (!client) return null;

  const leadPromise: Promise<{
    isLead: boolean;
    services: string;
    salesUser: User | null;
  } | null> = client.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: { isLead: true, services: true, salesUser: true },
      })
    : Promise.resolve(null);

  const invoicesPromise = db.invoice.findMany({
    where: { clientId: client.id },
    include: {
      invoiceItems: { include: { service: true } },
      vehicle: true,
    },
  });

  const [lead, invoices] = await Promise.all([leadPromise, invoicesPromise]);

  return (
    <div
      className={cn(
        "h-[40%] rounded-t-2xl text-white text-xs 2xl:text-base",
        // richer depth: gradient + subtle ring
        "bg-gradient-to-r from-[#006D77] to-[#0a8a95] ring-1 ring-white/10 pb-4"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-2 pt-4 xl:pt-2">
        <div className="block xl:hidden">
          <BackBtn />
        </div>
        <h2 className="px-1 text-sm font-semibold tracking-tight xl:p-3 xl:text-base">
          Client Data
        </h2>
        {/* Edit modal trigger */}
        <EditClientModalTrigger client={client} />
      </div>

      {/* Body */}
      <div className="grid h-[calc(100%-3rem)] grid-cols-1 gap-3 overflow-hidden px-2 md:grid-cols-2">
        {/* Left: identity & actions */}
        <div className="h-full rounded-xl">
          <div className="mt-3 flex items-center gap-4 px-3 sm:px-5">
            <Image
              src={
                !client.photo
                  ? "/images/default.png"
                  : client.photo.includes("/images/default.png")
                    ? "/images/default.png"
                    : client.photo
              }
              alt={
                `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() ||
                "Client"
              }
              width={96}
              height={96}
              className={cn(
                "h-20 w-20 rounded-full object-cover",
                "ring-2 ring-white/70 shadow-sm",
                "2xl:h-[110px] 2xl:w-[110px]"
              )}
            />

            <div className="mt-1 flex min-w-0 flex-col">
              <h3 className="truncate text-base font-semibold">
                <div className="min-w-0 truncate">
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="">
                        {client.firstName} {client.lastName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gradient-to-r from-[#006D77] to-[#0a8a95] text-white">
                      <p>
                        {client.firstName} {client.lastName}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </h3>

              {client.email && (
                <p className="mt-1 truncate text-[11px] opacity-90 2xl:text-sm">
                  <span className="opacity-80">Email:</span>{" "}
                  <span className="font-medium">{client.email}</span>
                </p>
              )}

              {client.mobile && (
                <p className="mt-1 truncate text-[11px] opacity-90 2xl:text-sm">
                  <span className="opacity-80">Phone:</span>{" "}
                  <span className="font-medium">{client.mobile}</span>
                </p>
              )}

              <div className="mt-3">
                <CreateAppointment clientId={client.id} />
              </div>

              {lead?.salesUser && (
                <p className="mt-3 text-[11px] opacity-90 2xl:text-sm">
                  <span className="opacity-80">Assigned Sales:</span>{" "}
                  <span className="font-medium">
                    {lead.salesUser.firstName} {lead.salesUser.lastName}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: vehicles & invoices */}
        <div
          className={cn(
            "custom-scrollbar max-h-[220px] w-full flex-1 overflow-y-auto rounded-xl",
            // readable frosted card on teal
            "bg-white/10 p-3 backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
          )}
        >
          <VehicleDetails
            isLeadClient={!!lead?.isLead}
            vehicles={vehicles}
            invoices={invoices}
            singleService={lead?.services ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
