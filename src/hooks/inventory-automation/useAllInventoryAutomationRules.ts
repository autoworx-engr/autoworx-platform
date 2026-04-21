import { AllInventoryAutomationRules } from "@/service/inventory-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllInventoryAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["inventory-automation"],
    queryFn: async () => await AllInventoryAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
