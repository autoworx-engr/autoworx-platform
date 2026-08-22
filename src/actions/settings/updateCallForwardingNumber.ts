"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

export const updateCallForwardingNumber = async (
  callForwardingNumber: string | null,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const companyId = await getCompanyId();

    const updatedCompany = await db.company.update({
      where: {
        id: companyId,
      },
      data: {
        callForwardingNumber,
      },
    });

    revalidatePath("/dashboard/settings/communications");
    return {
      type: "success",
      data: updatedCompany,
      message: "Call forwarding number updated successfully",
    };
  } catch (err) {
    return errorHandler(err);
  }
};
