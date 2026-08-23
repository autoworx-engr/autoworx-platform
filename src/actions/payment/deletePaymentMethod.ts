"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { getServerSession } from "next-auth";

export async function deletePaymentMethod(
  id: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to delete a payment method.");
    }

    await db.paymentMethod.delete({
      where: {
        id,
        companyId,
      },
    });

    return {
      type: "success",
      message: "Payment method deleted successfully",
    };
  } catch (err) {
    return errorHandler(err);
  }
}
