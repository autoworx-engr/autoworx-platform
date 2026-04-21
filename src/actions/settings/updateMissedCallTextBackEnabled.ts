"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

export const updateMissedCallTextBackEnabled = async (
  enabled: boolean,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const companyId = await getCompanyId();
    const entitlements = await getCompanyEntitlements(companyId);
    if (!entitlements.canUseSms || !entitlements.missedCallTextBack) {
      return {
        type: "error",
        message: "Your plan does not include missed call text back.",
      };
    }

    const updatedCompany = await db.company.update({
      where: {
        id: companyId,
      },
      data: {
        missedCallTextBackEnabled: enabled,
      },
    });

    revalidatePath("/dashboard/settings/communications");
    return {
      type: "success",
      data: updatedCompany,
      message: "Missed call text-back setting updated successfully",
    };
  } catch (err) {
    return errorHandler(err);
  }
};
