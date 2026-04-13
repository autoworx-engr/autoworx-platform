import {
  createGiftCardPromo,
  CreateGiftCardPromoPayload,
  deleteGiftCardPromo,
  getGiftCardPromos,
  updateGiftCardPromo,
  UpdateGiftCardPromoPayload,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreateGiftCardPromoParams = {
  shopId: number;
  payload: CreateGiftCardPromoPayload;
  accessToken: string;
};

type UpdateGiftCardPromoParams = {
  id: number;
  payload: UpdateGiftCardPromoPayload;
  accessToken: string;
};

type DeleteGiftCardPromoParams = {
  id: number;
  accessToken: string;
};

export const useGetGiftCardPromos = (shopId?: number, accessToken?: string) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-promos", shopId],
    queryFn: async () => {
      if (!accessToken || !shopId) {
        throw new Error("Missing access token or shop id");
      }

      return getGiftCardPromos(shopId, accessToken);
    },
    enabled: !!accessToken && !!shopId,
    staleTime: 1000 * 60,
  });
};

export const useCreateGiftCardPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shopId, payload, accessToken }: CreateGiftCardPromoParams) =>
      createGiftCardPromo(shopId, payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-promos"],
      });
    },
  });
};

export const useUpdateGiftCardPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, accessToken }: UpdateGiftCardPromoParams) =>
      updateGiftCardPromo(id, payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-promos"],
      });
    },
  });
};

export const useDeleteGiftCardPromo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, accessToken }: DeleteGiftCardPromoParams) =>
      deleteGiftCardPromo(id, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-promos"],
      });
    },
  });
};
