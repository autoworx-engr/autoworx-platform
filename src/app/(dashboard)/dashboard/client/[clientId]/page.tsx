import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Vehicle } from "@prisma/client";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientInformation from "../ClientInformation";
import OrderList from "../OrderList";
import VehicleList from "../VehicleList";

type Props = {
  params: Promise<{
    clientId: string;
  }>;
  searchParams: Promise<{
    vehicleId?: string;
  }>;
};

const Page = async (props: Props) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { clientId } = params;
  const { vehicleId } = searchParams;

  const companyId = await getCompanyId();
  const client = await db.client.findUnique({
    where: { id: Number(clientId), companyId },
    include: {
      source: true,
      tag: {
        where: { type: "CLIENT" },
      },
    },
  });

  if (!client) return notFound();

  const selectedVehicle = vehicleId
    ? await db.vehicle.findUnique({
        where: { id: Number(vehicleId) },
        include: {
          invoices: {
            where: {
              type: "Invoice",
            },
            include: { column: true },
          },
        },
      })
    : null;

  const vehicles = await db.vehicle.findMany({
    where: { clientId: Number(clientId) },
    include: {
      color: true,
    },
  });

  return (
    <div className="mb-2 h-fit p-2">
      <div className="">
        <div className="flex items-center gap-5 w-fit ">
          <Link
            href="/dashboard/client"
            className="rounded border p-1.5 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Title>Client</Title>
        </div>

        <div className="my-4 flex flex-col justify-between lg:flex-row lg:items-center">
          <div className="flex items-center gap-x-8 w-full">
            {/* <div className="relative min-w-0 flex-1 lg:max-w-[500px] bg-background">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400 dark:text-slate-300 transition-colors duration-300" />
              <input
                name="search"
                type="text"
                className="w-full border border-slate-300 ring-0 rounded-xl bg-transparent pr-3 pl-10 py-2 text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_8px_24px_rgba(101,113,255,0.08)] transition-all duration-300"
                placeholder="Search"
              />
            </div> */}
          </div>
        </div>
      </div>

      <div className="items-start justify-between gap-x-4 lg:flex lg:h-[70vh] 2xl:h-[78vh]">
        <div className="relative lg:hidden">
          <ResponsiveEmployeeCard data={client} index={0} />
        </div>
        <div
          className={`${selectedVehicle && "hidden lg:block"} app-shadow h-full w-full rounded-lg bg-background py-3 lg:w-1/2`}
        >
          <ClientInformation client={client} />
          <VehicleList
            clientId={Number(clientId)}
            vehicles={vehicles}
            selectedVehicle={selectedVehicle as Vehicle}
          />
        </div>
        <div className="box-2 orderList h-full lg:w-1/2">
          {selectedVehicle ? (
            <OrderList vehicle={selectedVehicle as any} />
          ) : (
            <div className="app-shadow hidden h-full w-full items-center justify-center rounded-lg bg-background p-4 lg:flex">
              Select Vehicle to view Orders
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Page;
