import { errorHandler } from "@/error-boundary/globalErrorHandler";
import nextAxios from "@/helpers/next-axios";
import { PermissionsResult } from "@/lib/getPermissions";

export const getUserPermissions = async (
  companyId: number,
  userId: number,
): Promise<PermissionsResult | null> => {
  try {
    const res = await nextAxios.get("/permissions/get-permissions", {
      params: { companyId, userId },
    });
    return res.data.data;
  } catch (error) {
    throw errorHandler(error);
  }
};
