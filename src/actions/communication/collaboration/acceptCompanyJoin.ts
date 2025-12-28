"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function acceptCompanyJoin(
  joinId: number,
  currentCompanyId: number
) {
  const join = await db.companyJoin.findUnique({
    where: { id: joinId },
  });

  if (!join) {
    throw new Error("Connection request not found");
  }

  if (join.companyTwoId !== currentCompanyId) {
    throw new Error("You are not allowed to accept this request");
  }

  if (join.status !== "PENDING") {
    throw new Error("This request is no longer pending");
  }

  await db.companyJoin.update({
    where: { id: joinId },
    data: {
      status: "ACCEPTED",
    },
  });

  revalidatePath("/dashboard/settings/networks");
}
