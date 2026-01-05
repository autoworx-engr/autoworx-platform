"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getTemplateList(
  params: Prisma.InvoiceTemplateFindManyArgs = {},
  search?: string
) {
  const companyId = await getCompanyId();
  try {
    const whereConditions: Prisma.InvoiceTemplateWhereInput[] = [{ companyId }];

    if (params.where) whereConditions.push(params.where);

    if (search) {
      whereConditions.push({
        title: {
          contains: search,
          mode: "insensitive",
        },
      });
    }

    const templates = await db.invoiceTemplate.findMany({
      ...params,
      where: {
        AND: whereConditions,
      },
    });

    return { templates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw new Error("Failed to get templates");
  }
}
