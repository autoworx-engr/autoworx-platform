"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Deactivates a company's Meta integration by setting `isActive = false`.
 *
 * The token and page data are retained so a reconnect can reuse the upsert
 * path without losing message history. The webhook stops processing messages
 * for this page because the handler skips credentials where `isActive = false`.
 *
 * @param integrationId - The `MetaCredentials.id` to deactivate
 */
export async function disconnectMeta(integrationId: number) {
  try {
    const companyId = await getCompanyId();

    await db.metaCredentials.update({
      where: { id: integrationId, companyId },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/settings/communications");
    return { success: true };
  } catch (error) {
    console.error("Error disconnecting Meta integration:", error);
    return { success: false };
  }
}
