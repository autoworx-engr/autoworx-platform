import { errorToast, successToast } from "@/lib/toast";
import { updateInventoryAutomationRule } from "@/service/inventory-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateInventoryAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-inventory-automation"],
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateInventoryAutomationRule(id, data),
    onSuccess: () => {
      successToast("Inventory automation rule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory-automation"] });
    },
    onError: (error) => {
      errorToast("Filed to update inventory automation rule!");
      console.error(error);
    },
  });
};
