"use client";
import { deleteVehicle } from "@/actions/vehicle/deleteVehicle";
import EditVehicle from "@/components/Lists/EditVehicle";
import NewVehicle from "@/components/Lists/NewVehicle";
import VehicleCard from "@/components/mobile-responsive/client/VehicleCard";
import { cn } from "@/lib/cn";
import { Vehicle } from "@prisma/client";
import { Popconfirm } from "antd";
import { Car, CarFront, X } from "lucide-react";
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
        <h3 className="text-xl font-bold tracking-tight text-slate-600">
          Client Vehicles
        </h3>
        {clientId && (
          <NewVehicle
            clientId={clientId}
            newButton={
              <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#8088FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition-all duration-300 hover:from-[#505aff] hover:to-primary hover:shadow-xl">
                + Add New Vehicle
              </button>
            }
          />
        )}
      </div>

      <VehicleCard vehicles={vehicles} clientId={clientId} />

      <div className="hidden lg:block rounded-xl bg-white shadow-2xl shadow-slate-100 ring-1 ring-slate-200">
        <div className="h-80 overflow-y-auto rounded-xl">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="h-12 border-b border-slate-200 text-sm font-semibold uppercase text-slate-500">
                <th className="px-6 py-3 text-left">Year</th>
                <th className="px-6 py-3 text-left">Make</th>
                <th className="px-6 py-3 text-left">Model</th>
                <th className="px-6 py-3 text-left">Plate</th>
                <th className="px-6 py-3 text-left">Other</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="border border-gray-200">
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Car size={40} strokeWidth={1.5} />
                      <p className="text-sm font-medium">
                        No vehicles found for this client
                      </p>
                      <p className="text-xs text-slate-400">
                        Click &quot;+ Add New Vehicle&quot; to get started
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {vehicles.map((vehicle, index) => (
                <tr
                  key={index}
                  className={cn(
                    "cursor-pointer rounded-md py-3",
                    index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
                    vehicleId &&
                      vehicleId === vehicle?.id &&
                      "border-2 border-primary",
                  )}
                  onClick={() => {
                    // use replace to avoid adding a new history entry for each selection
                    router.replace(
                      `/dashboard/client/${clientId}?vehicleId=${vehicle.id}`,
                    );
                  }}
                >
                  <td className="text-nowrap px-6 py-4 text-left">
                    {vehicle?.year || "N/A"}
                  </td>
                  <td className="text-nowrap px-6 py-4 text-left">
                    {vehicle.make || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-left">
                    {vehicle.model || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-left">
                    {vehicle.license || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-left">
                    {vehicle.other || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-left">
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
    </div>
  );
}
