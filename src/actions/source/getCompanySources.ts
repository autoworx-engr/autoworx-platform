"use server";

import { db } from "@/lib/db";

/**
 * Company-scoped source list for mobile/external clients.
 * Unlike getSources(), this filters by companyId so a token-authenticated
 * mobile client only ever sees its own company's sources.
 */
export async function getCompanySources(companyId: number) {
  return db.source.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}
