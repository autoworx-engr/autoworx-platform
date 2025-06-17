"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ServerAction } from "@/types/action";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
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
  skipEmailCheck?: boolean; // New optional parameter
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

    const updatedClientInfo = await db.client.update({
      where: {
        id: data.id, // Use `id` here to locate the record
      },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        customerCompany: data.customerCompany,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        tagId: data.tagId,
        sourceId: data.sourceId,
        photo: data.photo ? data.photo : undefined, // Only include `photo` if it exists
      },
    });

    revalidatePath("/client");

    return { type: "success", data: updatedClientInfo };
  } catch (err) {
    return errorHandler(err);
  }
}
