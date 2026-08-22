"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export default async function getCategories() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to fetch categories.");
  }

  return db.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}
