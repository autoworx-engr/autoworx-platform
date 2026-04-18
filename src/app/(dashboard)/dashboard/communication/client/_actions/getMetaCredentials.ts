"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

/**
 * Returns the active `MetaCredentials` for the current company, or `null` if
 * Meta is not connected. Only returns fields needed for UI display — the
 * encrypted `pageAccessToken` is never exposed to the client.
 *
 * Used by `ChatHead` (via `useServerGet`) to conditionally show the IG/FB
 * channel options or the "Connect Meta" prompt.
 */
export async function getMetaCredentials() {
  const companyId = await getCompanyId();
  return db.metaCredentials.findFirst({
    where: { companyId, isActive: true },
    select: {
      id: true,
      pageId: true,
      pageName: true,
      instagramAccountId: true,
      instagramUsername: true,
    },
  });
}
