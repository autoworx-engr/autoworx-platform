import { findOneTagAutomationRule } from "@/service/tag-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneTagAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["tag-automation", id],
    queryFn: async () => findOneTagAutomationRule(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
