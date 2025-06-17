import { deleteVehicle } from "@/actions/vehicle/deleteVehicle";
import EditVehicle from "@/components/Lists/EditVehicle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vehicle } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";

export default function VehicleCard({
  vehicles,
  clientId,
}: {
  vehicles: Vehicle[];
  clientId: number;
}) {
  const router = useRouter();
  return (
    <div className="lg:hidden">
      {vehicles.map((vehicle: any, index: number) => (
        <Card
          key={index}
          className="w-full text-[#66738C] transition-shadow hover:shadow-lg"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
            <CardTitle
              className="cursor-pointer text-2xl font-bold text-[#6571FF]"
              onClick={() => {
                router.push(
                  `/dashboard/client/${Number(vehicle.clientId)}?vehicleId=${vehicle.id}`,
                );
              }}
            >
              {vehicle.id}
            </CardTitle>
            <div className="flex gap-2">
              <EditVehicle vehicle={vehicle} />
              <button
                type="button"
                onClick={() => {
                  deleteVehicle(vehicle.id, clientId);
                }}
                className="text-xs text-red-500"
              >
                <FaTimes className="text-base" />
              </button>
            </div>
          </CardHeader>
          <CardContent
            className="cursor-pointer px-4"
            onClick={() => {
              router.push(
                `/dashboard/client/${Number(vehicle.clientId)}?vehicleId=${vehicle.id}`,
              );
            }}
          >
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Year</dt>
                <dd className="text-lg font-bold">{vehicle.year}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Make</dt>
                <dd className="text-lg font-bold">{vehicle.make}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Model</dt>
                <dd className="text-lg font-bold">{vehicle.model}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Plate</dt>
                <dd className="text-lg font-bold uppercase tracking-wider">
                  {vehicle.license}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
