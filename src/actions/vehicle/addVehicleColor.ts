"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export async function addVehicleColor(
  name: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();

    const existingColor = await db.vehicleColor.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        companyId,
      },
    });

    if (existingColor) {
      throw new Error("Color already exists");
    }

    const newColor = await db.vehicleColor.create({
      data: {
        name,
        companyId,
      },
    });

    return {
      type: "success",
      data: newColor,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
