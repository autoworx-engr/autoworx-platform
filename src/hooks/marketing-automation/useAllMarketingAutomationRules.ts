import { AllMarketingAutomationRules } from "@/service/marketing-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllMarketingAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["marketing-automation"],
    queryFn: async () => await AllMarketingAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
