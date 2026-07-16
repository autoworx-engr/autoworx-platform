import { deleteVehicle } from "@/actions/vehicle/deleteVehicle";
import EditVehicle from "@/components/Lists/EditVehicle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vehicle } from "@prisma/client";
import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

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
              className="cursor-pointer text-2xl font-bold text-primary"
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

              <Popconfirm
                title="Delete the Vehicle"
                description="Are you sure to delete this Vehicle?"
                okText="Yes"
                cancelText="No"
                onConfirm={() => deleteVehicle(vehicle.id, clientId)}
              >
                <X color="#f87171" size={18} strokeWidth={3} />
              </Popconfirm>
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
                <dd className="text-lg font-bold">{vehicle.year || ""}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Make</dt>
                <dd className="text-lg font-bold">{vehicle.make}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Model</dt>
                <dd className="text-lg font-bold">{vehicle.model}</dd>
              </div>
              {vehicle.other && (
                <div>
                  <dt className="font-medium text-muted-foreground">Other</dt>
                  <dd className="text-lg font-bold">{vehicle.other}</dd>
                </div>
              )}
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
