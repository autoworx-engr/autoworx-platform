import { AllMarketingAutomationRules } from "@/service/marketing-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllMarketingAutomationRules = () => {
  return useQuery({
    queryKey: ["marketing-automation"],
    queryFn: async () => await AllMarketingAutomationRules(),
  });
};
