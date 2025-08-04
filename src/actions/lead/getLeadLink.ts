"use server";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

export async function getLeadLink({
  companyId,
  shortUrl,
}: {
  companyId: number;
  shortUrl: string;
}): Promise<ServerAction> {
  const leadLink = await db.leadLink.findFirst({
    where: {
      companyId: companyId,
      shortUrl: shortUrl,
    },
  });

  return {
    type: "success",
    data: leadLink,
  };
}
