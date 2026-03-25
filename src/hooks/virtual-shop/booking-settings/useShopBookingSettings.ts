import {
  getShopBookingSettings,
  UpdateShopBookingSettingsPayload,
  updateShopBookingSettings,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UpdateBookingSettingsParams = {
  payload: UpdateShopBookingSettingsPayload;
  accessToken: string;
};

export const useGetShopBookingSettings = (shopId: number) => {
  return useQuery({
    queryKey: ["virtual-shop-booking-settings", shopId],
    queryFn: () => getShopBookingSettings(shopId),
    enabled: !!shopId,
    staleTime: 1000 * 60,
  });
};

export const useUpdateShopBookingSettings = (shopId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, accessToken }: UpdateBookingSettingsParams) =>
      updateShopBookingSettings(payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-booking-settings", shopId],
      });
    },
  });
};
