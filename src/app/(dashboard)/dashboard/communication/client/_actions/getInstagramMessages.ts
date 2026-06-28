"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

const DEFAULT_TAKE = 20;

export async function getInstagramMessages(
  clientId: number,
  params: { take?: number; skip?: number } = {},
) {
  const companyId = await getCompanyId();
  const take = params.take ?? DEFAULT_TAKE;
  const skip = params.skip ?? 0;

  const [messages, total] = await Promise.all([
    db.instagramMessage.findMany({
      where: { clientId, companyId },
      include: {
        attachments: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.instagramMessage.count({ where: { clientId, companyId } }),
  ]);

  return { data: messages, total };
}
