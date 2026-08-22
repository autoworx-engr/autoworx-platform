import { errorHandler } from "@/error-boundary/globalErrorHandler";
import nextAxios from "@/helpers/next-axios";

export type AppVersionData = {
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  message?: string | null;
};

export const getAppVersion = async (): Promise<AppVersionData> => {
  try {
    const res = await nextAxios.get("/app-version");
    return res.data;
  } catch (error) {
    throw errorHandler(error);
  }
};

export const updateAppVersion = async (
  data: AppVersionData,
): Promise<AppVersionData> => {
  try {
    const res = await nextAxios.patch("/app-version", data);
    return res.data.data;
  } catch (error) {
    throw errorHandler(error);
  }
};
