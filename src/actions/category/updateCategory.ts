"use server";

import { authOptions } from "@/authOptions";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export default async function updateCategory({
  categoryId,
  name,
  color,
}: {
  categoryId: number;
  name?: string;
  color?: string;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to update a category.");
  }

  const trimmedName = typeof name === "string" ? name.trim() : undefined;

  if (trimmedName !== undefined && trimmedName.length === 0) {
    return { type: "error", message: "Category name cannot be empty." };
  }

  if (
    trimmedName !== undefined &&
    trimmedName.length > CATEGORY_NAME_MAX_LENGTH
  ) {
    return {
      type: "error",
      message: `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (trimmedName === undefined && color === undefined) {
    return { type: "error", message: "Nothing to update." };
  }

  const existingCategory = await db.category.findFirst({
    where: { id: categoryId, companyId },
  });

  if (!existingCategory) {
    return {
      type: "error",
      message: "Category not found or you do not have permission to update it.",
    };
  }

  // Renaming onto an existing category would show two identical entries in
  // every picker, so reject it instead of silently allowing the duplicate.
  if (trimmedName !== undefined && trimmedName !== existingCategory.name) {
    const duplicate = await db.category.findFirst({
      where: { companyId, name: trimmedName, id: { not: categoryId } },
    });
    if (duplicate) {
      return {
        type: "error",
        message: "A category with that name already exists.",
      };
    }
  }

  const updated = await db.category.update({
    where: { id: categoryId },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(color !== undefined && { color }),
    },
  });

  return {
    type: "success",
    message: "Category updated successfully.",
    data: updated,
  };
}
