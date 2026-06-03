import {
  createShopService,
  createVirtualShopServiceBooking,
  CreateShopServicePayload,
  CreateVirtualShopServiceBookingPayload,
  deleteShopService,
  getShopServices,
  GetShopServicesParams,
  updateShopService,
  UpdateShopServicePayload,
  getShopCategories,
  getShopBySlug,
  getAppointmentSlots,
  getGiftCardTemplatesPublic,
  lookupClientByPhone,
  ShopServicesResponse,
  updateShopServiceStatus,
} from "@/service/virtual-shop/api";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useGetShopCategories = (shopId?: number) => {
  return useQuery({
    queryKey: ["virtual-shop-categories", shopId],
    queryFn: () => getShopCategories(Number(shopId)),
    enabled: !!shopId,
  });
};

export const useGetShopServices = (
  {
    shopId,
    page = 1,
    limit = 10,
    search,
    category,
  }: Partial<GetShopServicesParams>,
  options?: {
    enabled?: boolean;
    initialData?: ShopServicesResponse;
  },
) => {
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
    enabled: options?.enabled ?? !!shopId,
    initialData: options?.initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
};

export const useGetShopBySlug = (slug?: string, initialData?: any) => {
  return useQuery({
    queryKey: ["virtual-shop-by-slug", slug],
    queryFn: () => getShopBySlug(String(slug)),
    enabled: !!slug,
    initialData,
    staleTime: 1000 * 60,
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

export const useUpdateShopServiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: number;
      isActive: boolean;
      shopId?: number;
    }) => updateShopServiceStatus(id, isActive),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-services", variables?.shopId],
      });
    },
  });
};

export const useGetAppointmentSlots = (
  shopId?: number,
  date?: string,
  nextAvailable?: boolean,
  duration?: number,
) => {
  return useQuery({
    queryKey: ["appointment-slots", shopId, date, nextAvailable, duration],
    queryFn: () =>
      getAppointmentSlots(Number(shopId), date, nextAvailable, duration),
    enabled: !!shopId && (!!date || !!nextAvailable),
  });
};

export const useCreateVirtualShopServiceBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVirtualShopServiceBookingPayload) =>
      createVirtualShopServiceBooking(payload),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointment-slots", variables?.shopId],
      });
    },
  });
};

export const useLookupClientByPhone = () => {
  return useMutation({
    mutationFn: (payload: { phone: string; shopId: number }) =>
      lookupClientByPhone(payload),
  });
};

export const useInfiniteShopServices = (
  shopId?: number,
  limit = 10,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: ["virtual-shop-services-infinite", shopId, limit],
    queryFn: ({ pageParam }) =>
      getShopServices({
        shopId: Number(shopId),
        page: pageParam as number,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ShopServicesResponse) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    enabled: enabled && !!shopId,
  });
};
