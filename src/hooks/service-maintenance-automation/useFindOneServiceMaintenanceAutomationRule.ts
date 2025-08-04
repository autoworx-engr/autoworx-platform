import { findOneServiceMaintenanceAutomationRules } from "@/service/service-maintenance-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneServiceMaintenanceAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["service-maintenance-automation", id],
    queryFn: async () => findOneServiceMaintenanceAutomationRules(id),
    enabled: !!id,
  });
};
