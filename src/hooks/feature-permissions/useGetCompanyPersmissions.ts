import { allCompanyFeaturePermissions } from "@/service/feature-permissions/api";
import { useQuery } from "@tanstack/react-query";

export const useGetCompanyPermissions = (companyId: number) => {
  return useQuery({
    queryKey: ["companyPermissions", companyId],
    queryFn: async () => await allCompanyFeaturePermissions(companyId),
    enabled: !!companyId,
  });
};
