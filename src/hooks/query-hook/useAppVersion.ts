import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAppVersion,
  updateAppVersion,
  type AppVersionData,
} from "@/service/app-version/api";
import { successToast, errorToast } from "@/lib/toast";

export const APP_VERSION_QUERY_KEY = ["app-version"] as const;

export function useAppVersion(initialData?: AppVersionData) {
  return useQuery({
    queryKey: [...APP_VERSION_QUERY_KEY],
    queryFn: getAppVersion,
    initialData,
  });
}

export function useUpdateAppVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AppVersionData) => updateAppVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APP_VERSION_QUERY_KEY });
      successToast("App version updated successfully!");
    },
    onError: () => {
      errorToast("Failed to update app version!");
    },
  });
}
