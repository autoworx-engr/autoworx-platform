"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { createNewPaymentMethodValidation } from "@/validations/schemas/payment/paymentMethod.validation";
import { getServerSession } from "next-auth";

export async function newPaymentMethod(
  name: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }
    await createNewPaymentMethodValidation.parseAsync(name);

    const paymentMethod = await db.paymentMethod.create({
      data: {
        name,
        companyId,
      },
    });

    return {
      type: "success",
      message: "Payment method created",
      data: paymentMethod,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
