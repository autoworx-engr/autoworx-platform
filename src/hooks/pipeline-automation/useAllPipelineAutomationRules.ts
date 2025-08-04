import { AllPipelineAutomationRules } from "@/service/pipeline-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllPipelineAutomationRules = (companyId: number) => {
  return useQuery({
    queryKey: ["pipeline-automation"],
    queryFn: async () => await AllPipelineAutomationRules(companyId),
    enabled: !!companyId,
  });
};
