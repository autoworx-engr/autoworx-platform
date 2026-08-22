"use server";

import { authOptions } from "@/authOptions";
import { CATEGORY_NAME_MAX_LENGTH } from "@/lib/categoryConstants";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export default async function newCategory({
  name,
  color,
}: {
  name: string;
  color?: string;
}): Promise<ServerAction> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create a category.");
  }

  // Guarded here rather than per caller, since every create path in the app
  // funnels through this action.
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { type: "error", message: "Category name cannot be empty" };
  }

  if (trimmedName.length > CATEGORY_NAME_MAX_LENGTH) {
    return {
      type: "error",
      message: `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`,
    };
  }

  // Check if category already exists
  const existingCategory = await db.category.findFirst({
    where: {
      companyId,
      name: trimmedName,
    },
  });

  if (existingCategory) {
    return {
      type: "error",
      message: "Category already exists",
    };
  }

  const newCategory = await db.category.create({
    data: {
      companyId,
      name: trimmedName,
      color,
    },
  });

  return {
    type: "success",
    data: newCategory,
  };
}
