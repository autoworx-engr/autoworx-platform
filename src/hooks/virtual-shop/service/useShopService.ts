import {
  createShopService,
  CreateShopServicePayload,
  deleteShopService,
  getShopServices,
  GetShopServicesParams,
  updateShopService,
  UpdateShopServicePayload,
  getShopCategories,
  getShopBySlug,
} from "@/service/virtual-shop/api";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useGetShopCategories = (shopId?: number) => {
  return useQuery({
    queryKey: ["virtual-shop-categories", shopId],
    queryFn: () => getShopCategories(Number(shopId)),
    enabled: !!shopId,
  });
};

export const useGetShopServices = ({
  shopId,
  page = 1,
  limit = 10,
  search,
  category,
}: Partial<GetShopServicesParams>) => {
  return useQuery({
    queryKey: ["virtual-shop-services", shopId, page, limit, search, category],
    queryFn: () =>
      getShopServices({
        shopId: Number(shopId),
        page,
        limit,
        search,
        category,
      }),
    enabled: !!shopId,
    staleTime: 1000 * 30,
  });
};

export const useGetShopServicesInfinite = ({
  shopId,
  limit = 10,
  search,
  category,
}: Partial<GetShopServicesParams>) => {
  return useInfiniteQuery({
    queryKey: ["virtual-shop-services-infinite", shopId, limit, search, category],
    queryFn: ({ pageParam = 1 }) =>
      getShopServices({
        shopId: Number(shopId),
        page: pageParam,
        limit,
        search,
        category,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!shopId,
  });
};

export const useGetShopBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["virtual-shop-by-slug", slug], 
    queryFn: () => getShopBySlug(String(slug)),
    enabled: !!slug,
    staleTime: 1000 * 60,
  });
}
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
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-services", variables?.shopId],
      });

      toast.success(response?.message || "Shop service deleted successfully!");
    },
    onError: (error) => {
      const message =
        (error as { message?: string })?.message ||
        "Failed to delete shop service";
      toast.error(message);
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
