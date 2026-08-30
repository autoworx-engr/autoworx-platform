"use server";
import { db } from "@/lib/db";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import {
  serviceUpdateValidationSchema,
  TServiceUpdateValidationSchema,
} from "@/validations/schemas/estimate/service/service.validation";

export async function updateService(payload: TServiceUpdateValidationSchema) {
  try {
    const { id, name, categoryId, description, canned } =
      await serviceUpdateValidationSchema.parseAsync(payload);

    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;
    if (!companyId) {
      throw new Error("Company ID is required to update a service.");
    }
    if (canned) {
      const existingService = await db.service.findFirst({
        where: {
          companyId,
          name: { equals: name, mode: "insensitive" },
          canned: true,
          NOT: {
            id: id, // Exclude the current service being updated
          },
        },
      });

      if (existingService)
        throw new Error("Service already exists with this name");
    }
    const updatedService = await db.service.update({
      where: { companyId, id },
      data: {
        name,
        categoryId,
        description,
      },
    });

    revalidatePath("/dashboard/estimate", "layout");

    return {
      type: "success",
      data: updatedService,
    };
  } catch (error: any) {
    console.error("Error updating service:", error);
    return {
      type: "error",
      message:
        error instanceof ZodError
          ? error.errors[0]?.message || "Invalid service details"
          : error.message,
    };
  }
}
