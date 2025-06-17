import { AllInventoryAutomationRules } from "@/service/inventory-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllInventoryAutomationRules = () => {
  return useQuery({
    queryKey: ["inventory-automation"],
    queryFn: async () => await AllInventoryAutomationRules(),
  });
};
