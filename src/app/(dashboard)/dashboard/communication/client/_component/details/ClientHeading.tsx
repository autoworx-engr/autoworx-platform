import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { Client, User, Vehicle } from "@prisma/client";
import Image from "next/image";
import { X } from "lucide-react";
import BackBtn from "../conversations/BackBtn";
import EditClientModalTrigger from "./EditClientModalTrigger";
import ClientPermissionWrapper from "./ClientPermissionWrapper";
import { CreateAppointment, NewEstimateButton } from "./ClientHeadingDynamics";

type TProps = { client?: Client | null; vehicles?: Partial<Vehicle>[] };

export default async function ClientHeading({ client, vehicles = [] }: TProps) {
  if (!client) return null;

  const tagPromise = client.tagId
    ? db.tag.findUnique({ where: { id: client.tagId } })
    : Promise.resolve(null);

  const leadPromise: Promise<{ salesUser: User | null } | null> = client.leadId
    ? db.lead.findUnique({
      where: { id: client.leadId },
      select: { salesUser: true },
    })
    : Promise.resolve(null);

  const [tag, lead] = await Promise.all([tagPromise, leadPromise]);

  const fullName =
    `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Client";

  return (
    <section className="border-b border-zinc-200/70 bg-white px-4 pt-3 pb-4 dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="block xl:hidden">
            <BackBtn />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            Client details
          </h2>
        </div>

        <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
          <ClientPermissionWrapper
            companyId={client.companyId}
            clientId={client.id}
            initialValue={client.isSalesAgent ?? false}
          />
          <BackBtn
            asIcon
            label="Close"
            icon={<X className="h-4 w-4 text-zinc-500" />}
          />
        </div>
      </header>

      <div className="flex items-start gap-3">
        <Image
          src={
            !client.photo || client.photo.includes("/images/default.png")
              ? "/images/default.png"
              : client.photo
          }
          alt={fullName}
          width={56}
          height={56}
          className={cn(
            "h-14 w-14 shrink-0 rounded-full object-cover",
            "ring-2 ring-zinc-100 dark:ring-white/10",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {fullName}
            </h3>
            <EditClientModalTrigger client={client} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {tag?.name && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${tag.bgColor ?? "#E0F2F1"}`,
                  color: tag.textColor ?? "#006D77",
                }}
              >
                • {tag.name}
              </span>
            )}
            {vehicles?.length ? (
              <span className="rounded-full bg-[#006D77]/10 px-2 py-0.5 text-[11px] font-medium text-[#006D77] dark:bg-[#006D77]/20 dark:text-[#4dd2dc]">
                •{" "}
                {vehicles.length === 1
                  ? "Vehicle"
                  : `${vehicles.length} Vehicles`}
              </span>
            ) : null}
          </div>

          {client.email && (
            <p className="mt-2 truncate text-xs text-zinc-600 dark:text-zinc-300">
              {client.email}
            </p>
          )}
          {client.mobile && (
            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
              {client.countryCode === "US" ? "+1 " : ""}
              {client.mobile}
            </p>
          )}

          {lead?.salesUser && (
            <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Assigned: {lead.salesUser.firstName} {lead.salesUser.lastName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CreateAppointment clientId={client.id} />
        <NewEstimateButton clientId={client.id} />
      </div>
    </section>
  );
}
