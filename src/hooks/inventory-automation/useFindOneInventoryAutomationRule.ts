import { findOneInventoryAutomationRules } from "@/service/inventory-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneInventoryAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["inventory-automation", id],
    queryFn: async () => findOneInventoryAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
