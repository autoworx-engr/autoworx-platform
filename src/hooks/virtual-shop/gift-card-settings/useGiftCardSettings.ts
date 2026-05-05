import {
  UpdateGiftCardSettingsPayload,
  updateGiftCardSettings,
  getGiftCardSettingsByShopId,
  getGiftCardTemplatesPublic,
  buyGiftCard,
  BuyGiftCardPayload,
  getGiftCardSettings,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UpdateGiftCardSettingsParams = {
  shopId: number;
  payload: UpdateGiftCardSettingsPayload;
  accessToken: string;
};

export const useGetGiftCardSettings = (
  shopId?: number,
  accessToken?: string,
) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-settings", shopId],
    queryFn: async () => {
      if (!shopId || !accessToken) {
        throw new Error("Missing shop id or access token");
      }

      return getGiftCardSettings(shopId, accessToken);
    },
    enabled: !!shopId && !!accessToken,
    staleTime: 1000 * 60,
  });
};

export const useUpdateGiftCardSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shopId,
      payload,
      accessToken,
    }: UpdateGiftCardSettingsParams) =>
      updateGiftCardSettings(shopId, payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-settings"],
      });
    },
  });
};

export const useGetGiftCardSettingsByShopId = (shopId?: number) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-settings", shopId],
    queryFn: () => getGiftCardSettingsByShopId(Number(shopId)),
    enabled: !!shopId,
    staleTime: 1000 * 60,
  });
};

export const useGetGiftCardTemplatesPublic = (shopId?: number) => {
  return useQuery({
    queryKey: ["gift-card-templates-public", shopId],
    queryFn: () => getGiftCardTemplatesPublic(Number(shopId)),
    enabled: !!shopId,
  });
};

export const useBuyGiftCard = () => {
  return useMutation({
    mutationFn: (payload: BuyGiftCardPayload) => buyGiftCard(payload),
  });
};
