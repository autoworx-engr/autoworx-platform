import { AllInvoiceAutomationRules } from "@/service/invoice-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useAllInvoiceAutomationRules = () => {
  return useQuery({
    queryKey: ["invoice-automation"],
    queryFn: async () => await AllInvoiceAutomationRules(),
  });
};
