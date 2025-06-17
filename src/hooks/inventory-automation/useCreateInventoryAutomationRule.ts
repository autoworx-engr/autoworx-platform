import { errorToast, successToast } from "@/lib/toast";
import { createInventoryAutomationRule } from "@/service/inventory-automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateInventoryAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-inventory-automation"],
    mutationFn: async (payload: any) =>
      await createInventoryAutomationRule(payload),
    onSuccess: () => {
      successToast("Inventory automation rule created successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory-automation"] });
    },
    onError(error) {
      errorToast("Field to create inventory automation rule!");
      console.error(error);
    },
  });
};
