"use server";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

export async function getLeadLinks({
  companyId,
}: {
  companyId: number;
}): Promise<ServerAction> {
  const leadLinks = await db.leadLink.findMany({
    where: {
      companyId: companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    type: "success",
    data: leadLinks,
  };
}
