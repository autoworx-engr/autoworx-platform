import {
  configureVirtualShop,
  deleteShopConfigure,
  getShopById,
  getShopsByCompanyId,
  ShopData,
  updateShopConfigure,
} from "@/service/virtual-shop/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type UseGetVirtualShopConfigureOptions = {
  enabled?: boolean;
  initialData?: ShopData | null;
};

export const useGetVirtualShopConfigureById = (id?: number) => {
  return useQuery({
    queryKey: ["virtual-shop", id],
    queryFn: () => getShopById(id),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
};

export const useGetVirtualShops = (
  companyId: number,
  options?: UseGetVirtualShopConfigureOptions,
) => {
  return useQuery({
    queryKey: ["virtual-shops", companyId],
    queryFn: () => getShopsByCompanyId(companyId),
    enabled: options?.enabled ?? (!!companyId || companyId === undefined),
    initialData: options?.initialData,
    staleTime: 1000 * 60,
  });
};

export const useConfigureShop = (companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShopData) => configureVirtualShop(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shops", companyId],
      });
      toast.success("Virtual shop configured successfully!");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      toast.error(message);
    },
  });
};

export const useUpdateShop = (id?: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShopData) => updateShopConfigure(payload, id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop", id],
      });
      toast.success("Virtual shop configure updated successfully!");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      toast.error(message);
    },
  });
};

export const useDeleteShop = (id: number, companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteShopConfigure(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shops", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop", id],
      });
      toast.success("Virtual shop configure updated successfully!");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong";

      toast.error(message);
    },
  });
};
