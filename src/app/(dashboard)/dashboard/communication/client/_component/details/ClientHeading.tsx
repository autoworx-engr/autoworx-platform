import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { Client, User } from "@prisma/client";
import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import BackBtn from "../conversations/BackBtn";
import EditClientModalTrigger from "./EditClientModalTrigger";
import ClientPermissionWrapper from "./ClientPermissionWrapper";
import { CreateAppointment, NewEstimateButton } from "./ClientHeadingDynamics";
import type { ClientVehicle } from "./VehicleDetails";

type TProps = { client?: Client | null; vehicles?: ClientVehicle[] };

export default async function ClientHeading({ client, vehicles = [] }: TProps) {
  if (!client) return null;

  const leadPromise: Promise<{ salesUser: User | null } | null> = client.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: { salesUser: true },
      })
    : Promise.resolve(null);

  const tagPromise = client.tagId
    ? db.tag.findUnique({
        where: { id: client.tagId },
        select: { name: true, textColor: true, bgColor: true },
      })
    : Promise.resolve(null);

  const [lead, tag] = await Promise.all([leadPromise, tagPromise]);

  const fullName =
    `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Client";
  const initials =
    `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";
  const hasPhoto =
    !!client.photo &&
    client.photo.trim() !== "" &&
    !client.photo.includes("example.com");

  return (
    <div
      className={cn(
        "shrink-0 rounded-t-2xl text-white text-xs 2xl:text-base",
        "bg-gradient-to-r from-[#006D77] to-[#0a8a95] ring-1 ring-white/10",
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="block xl:hidden">
            <BackBtn />
          </div>
          <h2 className="text-sm font-semibold tracking-tight xl:text-base">
            Client details
          </h2>
        </div>
        <ClientPermissionWrapper
          companyId={client?.companyId}
          clientId={client.id}
          initialValue={client.isSalesAgent ?? false}
        />
      </div>

      {/* Body */}
      <div className="mt-3 space-y-4 px-3 pb-4">
        {/* Identity */}
        <div className="flex items-start gap-3">
          {hasPhoto ? (
            <Image
              src={client.photo}
              alt={fullName}
              width={96}
              height={96}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/70 2xl:h-16 2xl:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-semibold ring-2 ring-white/40 2xl:h-16 2xl:w-16">
              {initials}
            </div>
          )}

          <div className="mt-0.5 flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger>
                  <h3 className="truncate text-base font-semibold 2xl:text-lg">
                    {fullName}
                  </h3>
                </TooltipTrigger>
                <TooltipContent className="bg-gradient-to-r from-[#006D77] to-[#0a8a95] text-white">
                  <p>{fullName}</p>
                </TooltipContent>
              </Tooltip>
              <EditClientModalTrigger client={client} />
            </div>

            {tag && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {tag.name}
                </span>
              </div>
            )}

            {client.email && (
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] opacity-90 2xl:text-sm">
                <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate font-medium">{client.email}</span>
              </p>
            )}

            {client.mobile && (
              <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] opacity-90 2xl:text-sm">
                <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate font-medium">{client.mobile}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <CreateAppointment clientId={client.id} />
          </div>
          <div className="flex-1">
            <NewEstimateButton clientId={client.id} vehicles={vehicles} />
          </div>
        </div>

        {lead?.salesUser && (
          <p className="text-[11px] opacity-90 2xl:text-sm">
            <span className="opacity-80">Assigned Sales:</span>{" "}
            <span className="font-medium">
              {lead.salesUser.firstName} {lead.salesUser.lastName}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
