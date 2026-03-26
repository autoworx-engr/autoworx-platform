import {
  createGiftCardTemplate,
  CreateGiftCardTemplatePayload,
  deleteGiftCardTemplate,
  getGiftCardTemplates,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreateGiftCardTemplateParams = {
  payload: CreateGiftCardTemplatePayload;
  accessToken: string;
};

type DeleteGiftCardTemplateParams = {
  id: number;
  accessToken: string;
};

export const useGetGiftCardTemplates = (accessToken?: string) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-templates"],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Missing access token");
      }

      return getGiftCardTemplates(accessToken);
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });
};

export const useCreateGiftCardTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, accessToken }: CreateGiftCardTemplateParams) =>
      createGiftCardTemplate(payload, accessToken),
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
