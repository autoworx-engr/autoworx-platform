import { getClientEstimate } from "@/app/(dashboard)/dashboard/communication/client/_actions/getClientEstimate";
import { queryKeys } from "@/lib/queryKeys";
import { Prisma } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

export default function useEstimatesQueryByClient(
  clientId: number,
  select?: Prisma.InvoiceFindManyArgs["select"],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.estimatesByClientId(clientId),
    queryFn: () => {
      return getClientEstimate(clientId, {
        where: {
          clientId: clientId,
          type: "Estimate",
        },
        select: select,
      });
    },
    enabled: options?.enabled,
  });
}
