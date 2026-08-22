"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { z } from "zod";

const updateLeadTermsPolicySchema = z.object({
  leadTerms: z.string().optional(),
  leadPolicy: z.string().optional(),
});

export const updateLeadTermsPolicy = async (
  data: z.infer<typeof updateLeadTermsPolicySchema>,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const dataValidation = updateLeadTermsPolicySchema.safeParse(data);

    if (!dataValidation.success) {
      console.log("Update lead terms policy error", dataValidation.error);
      return {
        type: "error",
        message: "Validation failed",
      };
    }

    const validatedData = dataValidation.data;
    const companyId = await getCompanyId();

    await db.company.update({
      where: { id: companyId },
      data: {
        leadTerms: validatedData.leadTerms,
        leadPolicy: validatedData.leadPolicy,
      },
    });

    return {
      type: "success",
      message: "Terms and policy updated successfully",
    };
  } catch (error) {
    console.error("Error updating company lead terms and policy:", error);
    return errorHandler(error);
  }
};

export const getCompanyLeadTermsPolicy = async (): Promise<{
  leadTerms: string;
  leadPolicy: string;
} | null> => {
  try {
    const companyId = await getCompanyId();
    const companyData = await db.company.findUnique({
      where: { id: companyId },
      select: {
        leadTerms: true,
        leadPolicy: true,
      },
    });

    if (!companyData) {
      throw new Error("Company not found");
    }

    return {
      leadTerms: companyData.leadTerms ?? "",
      leadPolicy: companyData.leadPolicy ?? "",
    };
  } catch (error) {
    console.error("Error fetching company lead terms and policy:", error);
    return null;
  }
};
