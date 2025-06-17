import { errorToast, successToast } from "@/lib/toast";
import { deleteInvoiceAutomationRule } from "@/service/invoice-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteInvoiceAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-invoice-automation"],
    mutationFn: async (id: string) => await deleteInvoiceAutomationRule(id),
    onSuccess: () => {
      successToast("Invoice automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["invoice-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete invoice automation rule!");
      console.error(error);
    },
  });
};
