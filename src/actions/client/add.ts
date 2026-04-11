"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { normalizePhoneForStorage } from "@/utils/normalizePhone";
import { createClientValidationSchema } from "@/validations/schemas/client/client.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { initialCreateClientChatTrack } from "../communication/client/chat-track";

export async function addCustomer(
  data: {
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
    countryCode?: string;
  },
  pathname?: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    await createClientValidationSchema.parseAsync(data);
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }
    // Normalize phone number to digits-only for consistent matching
    const normalizedMobile = data.mobile
      ? normalizePhoneForStorage(data.mobile)
      : data.mobile;

    if (data.email) {
      const existingCustomer = await db.client.findFirst({
        where: { email: data.email, companyId, mobile: normalizedMobile },
      });

      if (existingCustomer) {
        return {
          type: "globalError",
          message: "A customer with this email already exists.",
        };
      }
    }

    if (normalizedMobile) {
      const existingCustomerByMobile = await db.client.findFirst({
        where: { companyId, mobile: normalizedMobile },
      });

      if (existingCustomerByMobile) {
        return {
          type: "globalError",
          message: "A customer with this mobile already exists.",
        };
      }
    }

    const newCustomer = await db.client.create({
      data: {
        ...data,
        mobile: normalizedMobile,
        companyId,
        photo: data.photo ? data.photo : undefined,
        isSalesAgent: true,
      },
    });

    await initialCreateClientChatTrack(newCustomer.id);

    if (pathname?.includes("/dashboard/client")) {
      revalidatePath(pathname);
    }

    return { type: "success", data: newCustomer };
  } catch (error: any) {
    return errorHandler(error);
  }
}
