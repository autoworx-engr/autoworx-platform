import { errorToast, successToast } from "@/lib/toast";
import { updateInvoiceAutomationRule } from "@/service/invoice-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateInvoiceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-invoice-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateInvoiceAutomationRule(id, data),
    onSuccess: () => {
      successToast("Invoice automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["invoice-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to update invoice automation rule!");
      console.error(error);
    },
  });
};
