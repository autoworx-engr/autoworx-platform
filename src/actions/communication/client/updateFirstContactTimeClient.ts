"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

const updateFirstContactTimeClient = async (clientId: number) => {
  const companyId = await getCompanyId();
  let client = await db.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  });
  if (!client?.firstContactTime) {
    await db.client.update({
      where: {
        id: clientId,
        companyId,
      },
      data: {
        firstContactTime: new Date(),
      },
    });
  }
};

export default updateFirstContactTimeClient;
