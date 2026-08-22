"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function disconnectFacebookPage(facebookPageDbId: number) {
  const companyId = await getCompanyId();

  await db.facebookPage.update({
    where: { id: facebookPageDbId, companyId },
    data: { isActive: false, webhookSubscribed: false },
  });

  revalidatePath("/dashboard/settings/communications");
}

export async function getConnectedFacebookPages() {
  const companyId = await getCompanyId();
  return db.facebookPage.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}
