import { db } from "@/lib/db";
import { Client, Service, Vehicle, Lead, User } from "@prisma/client";
import Image from "next/image";
// import CreateAppointment from "./CreateAppointment";
import dynamic from "next/dynamic";
import BackBtn from "../conversations/BackBtn";

type TProps = {
  client?: Client | null;
  vehicles?: Partial<Vehicle>[];
};

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
  } | null> = client?.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: {
          isLead: true,
          services: true,
          salesUser: true,
        },
      })
    : Promise.resolve(null);

  const invoicesPromise =
    client?.id &&
    db.invoice.findMany({
      where: { clientId: client.id },
      include: {
        invoiceItems: {
          include: { service: true },
        },
      },
    });

  const [lead, invoices] = await Promise.all([leadPromise, invoicesPromise]);

  const invoiceServices =
    invoices &&
    invoices.map((invoice) => invoice.invoiceItems.map((item) => item.service));

  const services =
    invoiceServices &&
    invoiceServices
      .flat()
      .filter((service): service is Service => service !== null);

  return (
    <div className="#h-[25%] h-[40%] rounded-t-lg bg-[#006D77] text-xs text-white 2xl:text-base">
      {/*  md:min-h-[35%] */}
      {/* Header */}
      <div className="flex px-2 pt-4 lg:pt-0">
        <div className="block lg:hidden">
          <BackBtn />
        </div>
        <h2 className="text-white lg:p-3">Client Data</h2>
      </div>
      <div className="mt-5 flex h-full flex-wrap items-center justify-between gap-5 pb-5 md:mt-0 md:gap-0 lg:flex-nowrap">
        <div className="flex w-[70%] rounded-lg md:h-[180px]">
          {/* Content */}
          <div className="flex items-center gap-5 px-5">
            {/* lg:flex-col gap-5 lg:flex-wrap 2xl:flex-row */}
            <Image
              src={
                !client?.photo
                  ? "/images/default.png"
                  : client.photo.includes("/images/default.png")
                    ? "/images/default.png"
                    : client.photo
              }
              alt="client"
              width={50}
              height={50}
              className="h-[50px] w-[50px] rounded-full 2xl:h-[110px] 2xl:w-[110px]"
            />

            <div className="mt-2 flex flex-col lg:mt-0">
              <h2 className="text-white">
                {client?.firstName} {client?.lastName}
              </h2>
              <p className="text-white">Email : {client?.email}</p>
              <p className="text-white">Phone : {client?.mobile}</p>
              <p>{client?.id && <CreateAppointment clientId={client?.id} />}</p>
              {lead?.salesUser && (
                <p className="text-white mt-4">
                  Assigned Sales :{" "}
                  {`${lead?.salesUser?.firstName} ${lead?.salesUser?.lastName}`}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="h-[75%] w-full py-2 pl-[10px] lg:w-auto lg:py-0 lg:pl-0">
          {client?.id && (
            <VehicleDetails
              isLeadClient={!!(lead && lead.isLead)}
              vehicles={vehicles || []}
              services={services || []}
              singleService={lead ? lead?.services : ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
