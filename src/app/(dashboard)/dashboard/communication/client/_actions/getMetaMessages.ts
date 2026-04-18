"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Fetches a paginated list of `ClientMetaMessage` rows for a given client.
 * Includes message attachments and the sending user's first/last name.
 *
 * @param clientId - The client whose Meta messages to fetch
 * @param params - Optional Prisma query args (take, skip, orderBy, where, etc.)
 * @param companyId - Override the session company ID (used in server-side contexts without a session)
 * @returns Object with `data` (message array) and `total` (unpaginated count)
 */
const getMetaMessages = async (
  clientId: number,
  params?: Prisma.ClientMetaMessageFindManyArgs,
  companyId?: number,
) => {
  const cId = companyId || (await getCompanyId());
  const { where, ...restParams } = params || {};

  const total = await db.clientMetaMessage.count({
    where: { clientId: +clientId, companyId: cId },
  });

  const messages = await db.clientMetaMessage.findMany({
    where: { clientId: +clientId, companyId: cId, ...(where || {}) },
    include: {
      attachments: true,
      user: { select: { firstName: true, lastName: true } },
    },
    ...restParams,
  });

  return { data: messages, total };
};

export default getMetaMessages;
