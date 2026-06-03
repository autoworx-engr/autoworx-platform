import { findOnePipelineAutomationRules } from "@/service/pipeline-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOnePipelineAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["pipeline-automation", id],
    queryFn: async () => findOnePipelineAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
