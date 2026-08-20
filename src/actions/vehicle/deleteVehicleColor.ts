"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export async function deleteVehicleColor(
  id: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();

    const existingColor = await db.vehicleColor.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingColor) {
      throw new Error("Color not found");
    }

    await db.vehicleColor.delete({
      where: {
        id,
      },
    });

    return {
      type: "success",
      data: null,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
