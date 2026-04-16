"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

const updateFirstContactTimeClient = async (
  clientId: number,
  companyId?: number,
) => {
  const cId = companyId || (await getCompanyId());
  let client = await db.client.findFirst({
    where: {
      id: clientId,
      companyId: cId,
    },
  });
  if (!client?.firstContactTime) {
    await db.client.update({
      where: {
        id: clientId,
        companyId: cId,
      },
      data: {
        firstContactTime: new Date(),
      },
    });
  }
};

export default updateFirstContactTimeClient;
