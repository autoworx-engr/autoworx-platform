"use server";

import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { revalidatePath } from "next/cache";
import { notifyRequester } from "./acceptCompanyJoin";

/**
 * Reject a company join request. The current company is derived from the
 * session — any passed-in `_currentCompanyId` argument is ignored (kept for
 * backwards compatibility with existing callers).
 */
export async function rejectCompanyJoin(
  joinId: number,
  _currentCompanyId?: number,
) {
  const currentCompanyId = await getCompanyId();
  if (!currentCompanyId) {
    throw new Error("Unauthorized");
  }

  const join = await db.companyJoin.findUnique({
    where: { id: joinId },
  });

  if (
    !join ||
    (join.companyOneId !== currentCompanyId &&
      join.companyTwoId !== currentCompanyId)
  ) {
    throw new Error("Unauthorized");
  }

  if (!join) {
    throw new Error("Connection request not found");
  }

  if (join.companyTwoId !== currentCompanyId) {
    throw new Error("You are not allowed to reject this request");
  }

  await db.companyJoin.update({
    where: { id: joinId },
    data: { status: "REJECTED" },
  });

  revalidatePath("/dashboard/settings/networks");
  await notifyRequester(join.companyOneId, currentCompanyId, "REJECTED");
}
