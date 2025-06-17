import NewCustomer from "@/components/Lists/NewCustomer";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Vehicle } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IoArrowBack, IoSearchOutline } from "react-icons/io5";
import EditClient from "../../client/EditClient";
import ClientInformation from "../ClientInformation";
import OrderList from "../OrderList";
import VehicleList from "../VehicleList";

type Props = {
  params: {
    clientId: string;
  };
  searchParams: {
    vehicleId?: string;
  };
};

const Page = async (props: Props) => {
  const { params, searchParams } = props;
  const { clientId } = params;
  const { vehicleId } = searchParams;

  const companyId = await getCompanyId();
  const client = await db.client.findUnique({
    where: { id: Number(clientId), companyId },
    include: {
      source: true,
      tag: true,
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
        <div className="w-fit rounded border p-1.5 md:hidden">
          <Link href="/dashboard/client">
            <IoArrowBack className="text-lg" />
          </Link>
        </div>
        <Title>Client</Title>

        <div className="my-4 flex flex-col justify-between lg:flex-row lg:items-center">
          <div className="flex items-center gap-x-8 bg-background">
            <div className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]">
              <span className="">
                <IoSearchOutline />
              </span>
              <input
                name="search"
                type="text"
                className="w-full rounded-md border px-4 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search"
              />
            </div>
          </div>
          <div className="mt-2 self-end">
            <NewCustomer
              buttonElement={
                <button className="rounded-md bg-[#6571FF] p-2 px-5 text-white">
                  + Add New Client
                </button>
              }
            />
          </div>
        </div>
      </div>

      <div className="items-start justify-between gap-x-4 lg:flex lg:h-[70vh] 2xl:h-[78vh]">
        <div className="relative lg:hidden">
          <div className="absolute right-2 top-1">
            <EditClient client={client} settingIcon />
          </div>
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
