"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function rejectCompanyJoin(
  joinId: number,
  currentCompanyId: number,
) {
  const join = await db.companyJoin.findUnique({
    where: { id: joinId },
  });

  if (!join) {
    throw new Error("Connection request not found");
  }

  if (join.companyTwoId !== currentCompanyId) {
    throw new Error("You are not allowed to reject this request");
  }

  await db.companyJoin.update({
    where: { id: joinId },
    data: {
      status: "REJECTED",
    },
  });

  revalidatePath("/dashboard/settings/networks");
}
