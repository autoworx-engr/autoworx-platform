"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getTemplates(
  params: Prisma.EmailTemplateFindManyArgs = {},
) {
  const companyId = await getCompanyId();
  try {
    const { where, ...restParams } = params || {};
    const emailTemplate = await db.emailTemplate.findMany({
      where: {
        companyId,
        ...(where || {}),
      },
      ...restParams,
    });
    return emailTemplate;
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
