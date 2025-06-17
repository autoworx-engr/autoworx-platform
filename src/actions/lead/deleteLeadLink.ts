"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { getServerSession } from "next-auth";

export async function deleteLeadLink(id: number): Promise<ServerAction> {
  await db.leadLink.delete({
    where: {
      id,
      // You can also double secure with companyId + id match if needed
    },
  });

  return {
    type: "success",
    data: { id },
  };
}
