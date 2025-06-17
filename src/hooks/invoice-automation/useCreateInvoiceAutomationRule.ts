import { errorToast, successToast } from "@/lib/toast";
import { createInvoiceAutomationRule } from "@/service/invoice-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateInvoiceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-invoice-automation"],
    mutationFn: async (payload: any) =>
      await createInvoiceAutomationRule(payload),
    onSuccess: () => {
      successToast("Invoice automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["invoice-automation"] });
    },
    onError(error) {
      errorToast("Failed to create invoice automation rule!");
      console.error(error);
    },
  });
};
