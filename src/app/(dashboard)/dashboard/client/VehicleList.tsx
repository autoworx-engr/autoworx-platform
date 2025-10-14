"use client";
import { deleteVehicle } from "@/actions/vehicle/deleteVehicle";
import EditVehicle from "@/components/Lists/EditVehicle";
import NewVehicle from "@/components/Lists/NewVehicle";
import VehicleCard from "@/components/mobile-responsive/client/VehicleCard";
import { cn } from "@/lib/cn";
import { Vehicle } from "@prisma/client";
import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VehicleList({
  clientId,
  vehicles,
  selectedVehicle,
}: {
  clientId: number;
  vehicles: Vehicle[];
  selectedVehicle: Vehicle;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = Number(searchParams?.get("vehicleId"));

  return (
    <div className={`${selectedVehicle && "hidden lg:block"} w-full space-y-2`}>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-x-8">
          <h3 className="text-lg font-semibold">Vehicle List</h3>
        </div>
        {clientId && (
          <NewVehicle
            clientId={clientId}
            newButton={
              <button className="rounded-md bg-[#6571FF] p-2 px-5 text-white">
                + Add New Vehicle
              </button>
            }
          />
        )}
      </div>

      <VehicleCard vehicles={vehicles} clientId={clientId} />

      <div className="hidden lg:block h-80 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr className="h-10 border-b">
              <th className="px-4 text-left 2xl:px-10">Year</th>
              <th className="px-4 text-left 2xl:px-10">Make</th>
              <th className="px-4 text-left 2xl:px-10">Model</th>
              <th className="px-4 text-left 2xl:px-10">Plate</th>
              <th className="px-4 text-left 2xl:px-10">Other</th>
              <th className="px-4 text-left 2xl:px-10">Actions</th>
            </tr>
          </thead>

          <tbody className="border border-gray-200">
            {vehicles.map((vehicle, index) => (
              <tr
                key={index}
                className={cn(
                  "cursor-pointer rounded-md py-3",
                  index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
                  vehicleId &&
                    vehicleId === vehicle?.id &&
                    "border-2 border-[#6571FF]"
                )}
                onClick={() => {
                  // use replace to avoid adding a new history entry for each selection
                  router.replace(
                    `/dashboard/client/${clientId}?vehicleId=${vehicle.id}`
                  );
                }}
              >
                <td className="text-nowrap px-4 py-1 text-left 2xl:px-10">
                  {vehicle?.year || ""}
                </td>
                <td className="text-nowrap px-4 py-1 text-left 2xl:px-10">
                  {vehicle.make}
                </td>
                <td className="px-4 py-1 text-left 2xl:px-10">
                  {vehicle.model}
                </td>
                <td className="px-4 py-1 text-left 2xl:px-10">
                  {vehicle.license}
                </td>
                <td className="px-4 py-1 text-left 2xl:px-10">
                  {vehicle.other}
                </td>
                <td className="px-4 py-1 text-left 2xl:px-10">
                  <div className="flex items-center gap-x-4 text-xl">
                    {" "}
                    <span onClick={(e) => e.stopPropagation()}>
                      <EditVehicle vehicle={vehicle} />
                    </span>
                    <Popconfirm
                      title="Delete the Vehicle"
                      description="Are you sure to delete this Vehicle?"
                      okText="Yes"
                      cancelText="No"
                      onConfirm={() => deleteVehicle(vehicle.id, clientId)}
                      onCancel={(e) => e && e.stopPropagation()}
                    >
                      <span onClick={(e) => e.stopPropagation()}>
                        <X color="#f87171" size={20} />
                      </span>
                    </Popconfirm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
