import {
  createGiftCardTemplate,
  CreateGiftCardTemplatePayload,
  deleteGiftCardTemplate,
  getGiftCardTemplates,
  updateGiftCardTemplate,
  UpdateGiftCardTemplatePayload,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreateGiftCardTemplateParams = {
  shopId: number;
  payload: CreateGiftCardTemplatePayload;
  accessToken: string;
};

type DeleteGiftCardTemplateParams = {
  id: number;
  accessToken: string;
};

type UpdateGiftCardTemplateParams = {
  id: number;
  payload: UpdateGiftCardTemplatePayload;
  accessToken: string;
};

export const useGetGiftCardTemplates = (
  shopId?: number,
  accessToken?: string,
) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-templates", shopId],
    queryFn: async () => {
      if (!accessToken || !shopId) {
        throw new Error("Missing access token or shop id");
      }

      return getGiftCardTemplates(shopId, accessToken);
    },
    enabled: !!accessToken && !!shopId,
    staleTime: 1000 * 60,
  });
};

export const useCreateGiftCardTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shopId,
      payload,
      accessToken,
    }: CreateGiftCardTemplateParams) =>
      createGiftCardTemplate(shopId, payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-templates"],
      });
    },
  });
};

export const useDeleteGiftCardTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, accessToken }: DeleteGiftCardTemplateParams) =>
      deleteGiftCardTemplate(id, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-templates"],
      });
    },
  });
};

export const useUpdateGiftCardTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload, accessToken }: UpdateGiftCardTemplateParams) =>
      updateGiftCardTemplate(id, payload, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual-shop-gift-card-templates"],
      });
    },
  });
};
