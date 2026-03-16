import {
  configureVirtualShop,
  getShopByCompanyId,
  ShopData,
  updateShopConfigure,
} from "@/service/virtual-shop/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useGetVirtualShopConfigure = (companyId: number) => {
  return useQuery({
    queryKey: ["virtual-shop", companyId],
    queryFn: () => getShopByCompanyId(companyId),
    enabled: !!companyId || companyId === undefined,
    staleTime: 1000 * 60,
  });
};

export const useConfigureShop = (companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShopData) => configureVirtualShop(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop", companyId],
      });
      toast.success("Virtual shop configured successfully!");
    },
  });
};

export const useUpdateShop = (companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShopData) => updateShopConfigure(payload, companyId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop", companyId],
      });
      toast.success("Virtual shop configure updated successfully!");
    },
  });
};
