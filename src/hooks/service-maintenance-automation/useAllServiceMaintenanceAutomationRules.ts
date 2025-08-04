import { AllServiceMaintenanceAutomationRules } from "@/service/service-maintenance-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllServiceMaintenanceAutomationRules = (companyId: number) => {
  return useQuery({
    queryKey: ["service-maintenance-automation"],
    queryFn: async () => await AllServiceMaintenanceAutomationRules(companyId),
    enabled: !!companyId
  });
};
