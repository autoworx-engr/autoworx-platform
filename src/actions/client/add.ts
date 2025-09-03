"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createClientValidationSchema } from "@/validations/schemas/client/client.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { initialCreateClientChatTrack } from "../communication/client/chat-track";

export async function addCustomer(data: {
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
}, pathname?: string): Promise<ServerAction | TErrorHandler> {
  try {
    await createClientValidationSchema.parseAsync(data);
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }
    if (data.email) {
      const existingCustomer = await db.client.findFirst({
        where: { email: data.email, companyId, mobile: data.mobile },
      });

      if (existingCustomer) {
        return {
          type: "globalError",
          message: "A customer with this email already exists.",
        };
      }
    }

    if (data.mobile) {
      const existingCustomerByMobile = await db.client.findFirst({
        where: { companyId, mobile: data.mobile },
      });

      if (existingCustomerByMobile) {
        return {
          type: "globalError",
          message: "A customer with this mobile already exists.",
        };
      }

      console.log(existingCustomerByMobile);
    }

    const newCustomer = await db.client.create({
      data: {
        ...data,
        companyId,
        photo: data.photo ? data.photo : undefined,
      },
    });

    await initialCreateClientChatTrack(newCustomer.id);

    if (pathname?.includes('/dashboard/client')) {
      revalidatePath(pathname);
    }

    return { type: "success", data: newCustomer };
  } catch (error: any) {
    return errorHandler(error);
  }
}
