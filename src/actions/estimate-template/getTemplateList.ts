"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getTemplateList(search?: string) {
  const companyId = await getCompanyId();
  try {
    const whereConditions: Prisma.InvoiceTemplateWhereInput[] = [{ companyId }];

    if (search) {
      whereConditions.push({
        title: {
          contains: search,
          mode: "insensitive",
        },
      });
    }

    const templates = await db.invoiceTemplate.findMany({
      where: {
        AND: whereConditions,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw new Error("Failed to get templates");
  }
}
