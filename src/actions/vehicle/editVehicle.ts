"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { updateVehicleValidationSchema } from "@/validations/schemas/vehicle/vehicle.validation";
import { revalidatePath } from "next/cache";

export async function editVehicle(data: {
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
  vehicleId: number;
  clientId: number;
}): Promise<ServerAction | TErrorHandler> {
  try {
    //  const session = await getServerSession(authOptions);
    // const companyId = session.user.companyId;

    // if (!companyId) {
    //   throw new Error("Company ID is required to create an email template.");
    // }

    await updateVehicleValidationSchema.parseAsync(data);
    // Prepare update data
    const updateData: any = {
      year: data.year,
      make: data.make,
      model: data.model,
      submodel: data.submodel,
      type: data.type,
      transmission: data.transmission,
      engineSize: data.engineSize,
      license: data.license,
      vin: data.vin,
      notes: data.notes,
      other: data.other,
    };

    // Handle color relation update
    if (data.colorId) {
      updateData.color = {
        connect: { id: data.colorId }, // Connect the vehicle to a color using colorId
      };
    }

    // Update vehicle in the database
    const vehicle = await db.vehicle.update({
      where: {
        id: data.vehicleId,
      },
      data: updateData,
    });

    revalidatePath("/client");

    return {
      type: "success",
      data: vehicle,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
