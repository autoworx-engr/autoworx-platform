import { AllCommunicationAutomationRules } from "@/service/communication-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllCommunicationAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["communication-automation"],
    queryFn: async () => await AllCommunicationAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
