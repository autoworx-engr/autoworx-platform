"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ServerAction } from "@/types/action";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
import { normalizePhoneForStorage } from "@/utils/normalizePhone";
import { updateClientValidationSchema } from "@/validations/schemas/client/client.validation";

export async function editClient(data: {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  customerCompany?: string;
  tagId?: number;
  photo?: string;
  sourceId?: number;
  isPremium?: boolean;
  skipEmailCheck?: boolean; // New optional parameter
  countryCode?: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    await updateClientValidationSchema.parseAsync(data);

    // Skip email check if skipEmailCheck is true
    if (!data.skipEmailCheck && data.email) {
      const existingClient = await db.client.findFirst({
        where: {
          email: data.email,
          id: { not: data.id },
        },
      });

      if (existingClient) {
        return {
          type: "globalError",
          message: "A customer with this email already exists.",
        };
      }
    }

    // Normalize phone number to digits-only for consistent matching
    const normalizedMobile = data.mobile
      ? normalizePhoneForStorage(data.mobile)
      : data.mobile;

    const updatedClientInfo = await db.client.update({
      where: {
        id: data.id, // Use `id` here to locate the record
      },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: normalizedMobile,
        countryCode: data.countryCode,
        customerCompany: data.customerCompany,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        tagId: data.tagId,
        isFleet: data.isPremium,
        sourceId: data.sourceId,
        photo: data.photo ? data.photo : undefined, // Only include `photo` if it exists
      },
      include: {
        fleet: true,
      },
    });

    if (updatedClientInfo.isFleet && !updatedClientInfo.fleet) {
      await db.fleet.create({
        data: {
          clientId: updatedClientInfo.id,
          fleetName:
            updatedClientInfo.firstName + " " + updatedClientInfo.lastName,
          contactName: updatedClientInfo.firstName,
          preferredPaymentTerm: null,
        },
      });
    }

    if (!updatedClientInfo.isFleet && updatedClientInfo.fleet) {
      const hasStatements = await db.fleetStatement.findFirst({
        where: {
          fleetId: updatedClientInfo.fleet.id,
        },
      });

      if (hasStatements) {
        await db.client.update({
          where: {
            id: updatedClientInfo.id,
          },
          data: {
            isFleet: true,
          },
        });

        revalidatePath("/dashboard/client");
        throw new Error(
          "Cannot remove fleet status because there are existing statements for this fleet.",
        );
      }

      await db.fleet.delete({
        where: {
          clientId: updatedClientInfo.id,
          id: updatedClientInfo.fleet.id,
        },
      });
    }

    revalidatePath("/dashboard/client");

    return { type: "success", data: updatedClientInfo };
  } catch (err) {
    return errorHandler(err);
  }
}
