import {
  createShopService,
  CreateShopServicePayload,
  deleteShopService,
  getShopServices,
  GetShopServicesParams,
  updateShopService,
  UpdateShopServicePayload,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useGetShopServices = ({
  shopId,
  page = 1,
  limit = 10,
  search,
}: Partial<GetShopServicesParams>) => {
  return useQuery({
    queryKey: ["virtual-shop-services", shopId, page, limit, search],
    queryFn: () =>
      getShopServices({
        shopId: Number(shopId),
        page,
        limit,
        search,
      }),
    enabled: !!shopId,
    staleTime: 1000 * 30,
  });
};

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

export const useDeleteShopService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; shopId?: number }) =>
      deleteShopService(id),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-services", variables?.shopId],
      });

      toast.success("Shop service deleted successfully!");
    },
  });
};

export const useUpdateShopService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateShopServicePayload;
    }) => updateShopService(id, payload),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-services", variables?.payload?.shopId],
      });

      if (variables?.payload?.companyId) {
        queryClient.invalidateQueries({
          queryKey: ["virtual-shop", variables.payload.companyId],
        });
      }

      toast.success("Shop service updated successfully!");
    },
  });
};
