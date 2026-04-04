"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

export const updateCallWhisperEnabled = async (
  enabled: boolean,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const companyId = await getCompanyId();

    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: { callWhisperEnabled: enabled },
    });

    revalidatePath("/dashboard/settings/communications");
    return {
      type: "success",
      data: updatedCompany,
      message: `Call whisper ${enabled ? "enabled" : "disabled"} successfully`,
    };
  } catch (err) {
    return errorHandler(err);
  }
};
