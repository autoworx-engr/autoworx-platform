"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

export async function getTags(tagType?: string): Promise<ServerAction> {
  const companyId = await getCompanyId();

  const whereClause: any = {
    companyId,
  };

  // Add type filter if provided
  if (tagType) {
    whereClause.type = tagType;
  }

  const tags = await db.tag.findMany({
    where: whereClause,
  });

  return {
    type: "success",
    data: tags,
  };
}
