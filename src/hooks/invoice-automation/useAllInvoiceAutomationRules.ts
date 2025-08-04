import { AllInvoiceAutomationRules } from "@/service/invoice-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllInvoiceAutomationRules = (companyId: number) => {
  return useQuery({
    queryKey: ["invoice-automation"],
    queryFn: async () => await AllInvoiceAutomationRules(companyId),
    enabled: !!companyId,
  });
};
