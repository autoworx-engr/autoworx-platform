import { findOneMarketingAutomationRules } from "@/service/marketing-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneMarketingAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["marketing-automation", id],
    queryFn: async () => findOneMarketingAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
