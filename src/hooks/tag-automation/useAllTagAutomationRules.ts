import { AllTagAutomationRules } from "@/service/tag-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllTagAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["tag-automation"],
    queryFn: async () => await AllTagAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
