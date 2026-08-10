import { AllPipelineAutomationRules } from "@/service/pipeline-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllPipelineAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["pipeline-automation"],
    queryFn: async () => await AllPipelineAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
