import { getCompany } from "@/actions/settings/getCompany";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useCompanyQuery() {
  return useQuery({
    queryKey: [queryKeys.company],
    queryFn: async () => {
      return getCompany();
    },
    staleTime: 24 * 3600 * 1000,
  });
}
