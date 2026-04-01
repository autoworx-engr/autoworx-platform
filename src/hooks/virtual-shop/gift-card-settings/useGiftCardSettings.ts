import {
  UpdateGiftCardSettingsPayload,
  updateGiftCardSettings,
  getGiftCardSettingsByCompanyId,
  getGiftCardTemplatesPublic,
  buyGiftCard,
  BuyGiftCardPayload,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UpdateGiftCardSettingsParams = {
  payload: UpdateGiftCardSettingsPayload;
  accessToken: string;
};

export const useGetGiftCardSettings = (companyId?: number) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-settings", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Missing company id");
      }

      return getGiftCardSettingsByCompanyId(Number(companyId));
    },
    enabled: !!companyId,
    staleTime: 1000 * 60,
  });
};

export const useUpdateGiftCardSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, accessToken }: UpdateGiftCardSettingsParams) =>
      updateGiftCardSettings(payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-settings"],
      });
    },
  });
};

export const useGetGiftCardSettingsByCompanyId = (companyId?: number) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-settings", companyId],
    queryFn: () => getGiftCardSettingsByCompanyId(Number(companyId)),
    enabled: !!companyId,
    staleTime: 1000 * 60,
  });
};

export const useGetGiftCardTemplatesPublic = (companyId?: number) => {
  return useQuery({
    queryKey: ["gift-card-templates-public", companyId],
    queryFn: () => getGiftCardTemplatesPublic(Number(companyId)),
    enabled: !!companyId,
  });
};

export const useBuyGiftCard = () => {
  return useMutation({
    mutationFn: (payload: BuyGiftCardPayload) => buyGiftCard(payload),
  });
};
