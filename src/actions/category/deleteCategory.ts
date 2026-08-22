"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export default async function deleteCategory({
  categoryId,
}: {
  categoryId: number;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to delete a category.");
  }

  // Check if category exists and belongs to the user's company
  const existingCategory = await db.category.findFirst({
    where: {
      id: categoryId,
      companyId: companyId,
    },
  });

  if (!existingCategory) {
    return {
      type: "error",
      message: "Category not found or you do not have permission to delete it.",
    };
  }

  await db.$transaction([
    db.appointment.updateMany({
      where: { serviceCategoryId: categoryId },
      data: { serviceCategoryId: null },
    }),
    db.service.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    }),
    db.material.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    }),
    db.labor.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    }),
    db.inventoryProduct.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    }),
    db.servicePlaybook.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    }),
    db.category.delete({ where: { id: categoryId } }),
  ]);

  return {
    type: "success",
    message: "Category deleted successfully.",
  };
}
