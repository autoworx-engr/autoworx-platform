import {
  createGiftCardSettings,
  getGiftCardSettings,
  UpdateGiftCardSettingsPayload,
  updateGiftCardSettings,
} from "@/service/virtual-shop/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UpdateGiftCardSettingsParams = {
  payload: UpdateGiftCardSettingsPayload;
  accessToken: string;
};

function isNotFoundError(error: any) {
  const status = error?.statusCode ?? error?.response?.status;
  return status === 404;
}

export const useGetGiftCardSettings = (accessToken?: string) => {
  return useQuery({
    queryKey: ["virtual-shop-gift-card-settings"],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Missing access token");
      }

      try {
        return await getGiftCardSettings(accessToken);
      } catch (error: any) {
        if (isNotFoundError(error)) {
          return createGiftCardSettings(accessToken);
        }

        throw error;
      }
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60,
    retry: false,
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
