"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createVehicleValidationSchema } from "@/validations/schemas/vehicle/vehicle.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function addVehicle(data: {
  year: number;
  make: string;
  model: string;
  submodel: string;
  type: string;
  colorId?: number;
  transmission: string;
  engineSize: string;
  license: string;
  vin: string;
  notes: string;
  other: string;
  clientId: number;
}): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }
    await createVehicleValidationSchema.parseAsync(data);

    // Add vehicle to the database
    const vehicle = await db.vehicle.create({
      data: {
        ...data,
        companyId,
      },
    });

    revalidatePath("/client");

    return {
      type: "success",
      data: vehicle,
    };
  } catch (error: any) {
    return errorHandler(error);
  }
}
