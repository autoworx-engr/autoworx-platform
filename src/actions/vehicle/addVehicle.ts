"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createVehicleValidationSchema } from "@/validations/schemas/vehicle/vehicle.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function addVehicle(
  data: {
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
    forceCompanyId?: number;
  },
  pathname?: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    let companyId = data.forceCompanyId;

    if (!companyId) {
      const session = await getServerSession(authOptions);
      companyId = session?.user.companyId;
      if (!companyId) {
        throw new Error("Company ID is required to create a vehicle.");
      }
    }
    await createVehicleValidationSchema.parseAsync(data);

    // Check if vehicle already exists
    const existingVehicle = await db.vehicle.findFirst({
      where: {
        clientId: data.clientId,
        year: data.year,
        make: data.make,
        model: data.model,
        companyId,
      },
    });

    if (existingVehicle) {
      return {
        type: "success",
        data: existingVehicle,
      };
    }

    const { forceCompanyId: _, ...rest } = data;

    // Add vehicle to the database
    const vehicle = await db.vehicle.create({
      data: {
        ...rest,
        companyId,
      },
    });

    if (pathname?.includes("/dashboard/client")) {
      revalidatePath(pathname);
    }

    return {
      type: "success",
      data: vehicle,
    };
  } catch (error: any) {
    return errorHandler(error);
  }
}
