import { errorToast, successToast } from "@/lib/toast";
import { deleteInventoryAutomationRule } from "@/service/inventory-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteInventoryAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-inventory-automation"],
    mutationFn: async (id: string) => await deleteInventoryAutomationRule(id),
    onSuccess: () => {
      successToast("Inventory automation rule deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory-automation"] });
    },
    onError: (error) => {
      errorToast("Failed to delete inventory automation rule!");
      console.error(error);
    },
  });
};
