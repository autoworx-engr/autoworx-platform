"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export async function getVehicleColors(): Promise<
  ServerAction | TErrorHandler
> {
  try {
    const companyId = await getCompanyId();

    const colors = await db.vehicleColor.findMany({
      where: {
        companyId,
      },
    });

    return {
      type: "success",
      data: colors,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
