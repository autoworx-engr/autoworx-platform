"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateBusinessAccountValidationSchema,
  updateBusinessAccountValidationSchema,
} from "@/validations/schemas/settings/business-account/businessAccount.validation";
import { revalidatePath } from "next/cache";

export const updateCompany = async (
  companyData: TUpdateBusinessAccountValidationSchema,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const companyId = await getCompanyId();
    const validatedData =
      await updateBusinessAccountValidationSchema.parseAsync(companyData);
    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: validatedData,
    });
    revalidatePath("/dashboard/settings/business");
    return { type: "success", data: updatedCompany };
  } catch (err) {
    return errorHandler(err);
  }
};
