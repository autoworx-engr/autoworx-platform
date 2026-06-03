import { AllReportingAutomationRules } from "@/service/reporting-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllReportingAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["reporting-automation"],
    queryFn: async () => await AllReportingAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
