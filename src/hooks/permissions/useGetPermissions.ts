import { getUserPermissions } from "@/service/permissions/api";
import { useQuery } from "@tanstack/react-query";

export const useGetPermissions = (
  companyId?: number | null,
  userId?: number | null,
) => {
  return useQuery({
    queryKey: ["permissions", companyId, userId],
    queryFn: () => getUserPermissions(companyId as number, userId as number),
    enabled: !!companyId && !!userId,
  });
};
