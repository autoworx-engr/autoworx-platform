"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getClientList(
  params: Prisma.ClientFindManyArgs = {}
) {
  const companyId = await getCompanyId();

  try {
    const clients = await db.client.findMany({
      ...params,
      where: {
        AND: [{ companyId }, ...(params?.where ? [params.where] : [])],
      },
    });

    return clients;
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
