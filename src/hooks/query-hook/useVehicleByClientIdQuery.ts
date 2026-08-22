import { getVehicles } from "@/actions/vehicle/getVehicles";
import { queryKeys } from "@/lib/queryKeys";
import { Vehicle } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

export default function useVehicleByClientIdQuery(
  clientId: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.vehicleByClientId(clientId),
    queryFn: async () => {
      const response = await getVehicles({
        where: {
          clientId: clientId,
        },
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          other: true,
        },
      });
      if (response.type === "success") {
        return response.data as Vehicle[];
      }
    },
    enabled: options?.enabled ?? true,
  });
}
