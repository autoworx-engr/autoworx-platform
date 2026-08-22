import { findOneInvoiceAutomationRules } from "@/service/invoice-automation/api";
import { useQuery } from "@tanstack/react-query";

export const useFindOneInvoiceAutomationRule = (id: number) => {
  return useQuery({
    queryKey: ["invoice-automation", id],
    queryFn: async () => findOneInvoiceAutomationRules(id),
    enabled: !!id,
    staleTime: 3600 * 1000,
  });
};
