import { findOneReportingAutomationRules } from "@/service/reporting-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneReportingAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["reporting-automation", id],
    queryFn: async () => findOneReportingAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
