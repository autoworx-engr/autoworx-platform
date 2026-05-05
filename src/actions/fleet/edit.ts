"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ServerAction } from "@/types/action";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
import { updateFleetValidationSchema } from "@/validations/schemas/fleet/fleet.validation";

export async function editFleet(data: {
  id: number;
  fleetName: string;
  contactName: string;
  email: string;
  mobile: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  tagId?: number;
  photo?: string;
  preferredPaymentTerm?: string | null;
  clientId: number;
  countryCode?: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    await updateFleetValidationSchema.parseAsync(data);

    const existingFleet = await db.client.findFirst({
      where: {
        // email: data.email,
        id: data.clientId,
        isFleet: true,
      },
    });

    if (!existingFleet) {
      return {
        type: "globalError",
        message: "The fleet not exist!",
      };
    }

    // if (existingFleet.mobile !== data.mobile) {
    //   throw new Error("Mobile number cannot be changed for an existing fleet.");
    // }

    const updatedFleet = await db.$transaction(async (tsx) => {
      await tsx.client.update({
        where: {
          id: data.clientId,
        },
        data: {
          email: data.email || existingFleet.email,
          mobile: data.mobile || existingFleet.mobile,
          address: data.address || existingFleet.address,
          city: data.city || existingFleet.city,
          state: data.state || existingFleet.state,
          zip: data.zip || existingFleet.zip,
          tagId: data.tagId || existingFleet.tagId,
          photo: data.photo || existingFleet.photo,
          countryCode: data.countryCode || existingFleet.countryCode,
        },
      });
      const fleet = await tsx.fleet.update({
        where: {
          clientId: existingFleet.id,
        },
        data: {
          fleetName: data.fleetName,
          contactName: data.contactName,
          preferredPaymentTerm: data?.preferredPaymentTerm,
        },
      });

      return fleet;
    });

    revalidatePath("/dashboard/fleet");

    return { type: "success", data: updatedFleet };
  } catch (err) {
    return errorHandler(err);
  }
}
