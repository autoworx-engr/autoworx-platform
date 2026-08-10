import { AllInvoiceAutomationRules } from "@/service/invoice-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllInvoiceAutomationRules = (
  companyId: number,
  shouldFetch: boolean = true,
) => {
  return useQuery({
    queryKey: ["invoice-automation"],
    queryFn: async () => await AllInvoiceAutomationRules(companyId),
    enabled: !!companyId && shouldFetch,
    staleTime: 3600 * 1000,
  });
};
