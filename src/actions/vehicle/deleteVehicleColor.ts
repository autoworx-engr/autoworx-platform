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

    const deleted = await db.vehicleColor.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Color not found");
    }

    return {
      type: "success",
      data: null,
    };
  } catch (err) {
    console.error("deleteVehicleColor error:", err);
    return errorHandler(err);
  }
}
