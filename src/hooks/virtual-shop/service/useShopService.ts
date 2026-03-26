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
} from "@/service/virtual-shop/api";
import {
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



export const useGetShopBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["virtual-shop-by-slug", slug],
    queryFn: () => getShopBySlug(String(slug)),
    enabled: !!slug,
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

export const useGetAppointmentSlots = (
  shopId?: number,
  date?: string,
  nextAvailable?: boolean,
) => {
  return useQuery({
    queryKey: ["appointment-slots", shopId, date, nextAvailable],
    queryFn: () => getAppointmentSlots(Number(shopId), date, nextAvailable),
    enabled: !!shopId && (!!date || !!nextAvailable),
  });
};

export const useCreateVirtualShopServiceBooking = () => {
  return useMutation({
    mutationFn: (payload: CreateVirtualShopServiceBookingPayload) =>
      createVirtualShopServiceBooking(payload),
  });
};





