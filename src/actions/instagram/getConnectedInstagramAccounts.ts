"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getConnectedInstagramAccounts() {
  const companyId = await getCompanyId();
  return db.instagramAccount.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function disconnectInstagramAccount(igAccountDbId: number) {
  const companyId = await getCompanyId();
  await db.instagramAccount.update({
    where: { id: igAccountDbId, companyId },
    data: { isActive: false, webhookSubscribed: false },
  });
  revalidatePath("/dashboard/settings/communications");
}
