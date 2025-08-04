"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  serviceCreateValidationSchema,
  TServiceCreateValidationSchema,
} from "@/validations/schemas/estimate/service/service.validation";
import { revalidatePath } from "next/cache";

interface NewServiceByTokenParams extends TServiceCreateValidationSchema {
  token: string;
}

export default async function newServiceByToken({
  name,
  categoryId,
  description,
  canned = false,
  token,
}: NewServiceByTokenParams): Promise<ServerAction | TErrorHandler> {
  try {
    const validatedServiceInfo = await serviceCreateValidationSchema.parseAsync(
      {
        name,
        categoryId,
        description,
        canned,
      },
    );

    // Find company by token
    const company = await db.company.findUnique({
      where: {
        zapierToken: token,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new Error("Company not found for provided token");
    }

    const existingService = await db.service.findFirst({
      where: {
        companyId: company.id,
        name: validatedServiceInfo.name,
      },
    });

    if (existingService)
      throw new Error("Service already exists with this name");

    const newService = await db.service.create({
      data: {
        companyId: company.id,
        ...validatedServiceInfo,
      },
    });

    revalidatePath("/estimate");

    return {
      type: "success",
      data: newService,
    };
  } catch (err) {
    return errorHandler(err);
  }
}
