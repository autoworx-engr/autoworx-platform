import { findOneCommunicationAutomationRules } from "@/service/communication-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneCommunicationAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["communication-automation", id],
    queryFn: async () => findOneCommunicationAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
