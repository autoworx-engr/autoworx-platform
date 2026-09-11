"use server";
import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  serviceCreateValidationSchema,
  TServiceCreateValidationSchema,
} from "@/validations/schemas/estimate/service/service.validation";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export default async function newService({
  name,
  categoryId,
  description,
  canned,
}: TServiceCreateValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    const validatedServiceInfo = await serviceCreateValidationSchema.parseAsync(
      {
        name,
        categoryId,
        description,
        canned,
      },
    );
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

    if (canned) {
      const existingService = await db.service.findFirst({
        where: {
          companyId,
          name: { equals: validatedServiceInfo.name, mode: "insensitive" },
          canned: true,
        },
      });

      if (existingService)
        throw new Error("Service already exists with this name");
    }

    const newService = await db.service.create({
      data: {
        companyId,
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
