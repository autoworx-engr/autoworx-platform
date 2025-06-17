import { AllCommunicationAutomationRules } from "@/service/communication-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllCommunicationAutomationRules = (companyId: number) => {
  return useQuery({
    queryKey: ["communication-automation"],
    queryFn: async () => await AllCommunicationAutomationRules(companyId),
    enabled: !!companyId,
  });
};
