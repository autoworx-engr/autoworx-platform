"use server";

import { ServerAction } from "@/types/action";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

export async function updateService({
  id,
  name,
  categoryId,
  description,
  canned,
}: {
  id: number;
  name: string;
  categoryId?: number | null;
  description?: string;
  canned?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;
    if (!companyId) {
      throw new Error("Company ID is required to update a service.");
    }
    if (canned) {
      const existingService = await db.service.findFirst({
        where: {
          companyId,
          name: name,
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
      message: error.message,
    };
  }
}
