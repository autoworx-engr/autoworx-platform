import {
  createShopService,
  CreateShopServicePayload,
} from "@/service/virtual-shop/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useCreateShopService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShopServicePayload) =>
      createShopService(payload),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-services", variables?.shopId],
      });

      if (variables?.companyId) {
        queryClient.invalidateQueries({
          queryKey: ["virtual-shop", variables.companyId],
        });
      }

      toast.success("Shop service created successfully!");
    },
  });
};
