"use server";

import { authOptions } from "@/authOptions";
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

  // Check if category already exists
  const existingCategory = await db.category.findFirst({
    where: {
      companyId,
      name,
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
      name,
      color,
    },
  });

  return {
    type: "success",
    data: newCategory,
  };
}
