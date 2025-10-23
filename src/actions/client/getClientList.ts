"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getClientList(
  params: Prisma.ClientFindManyArgs = {},
  search?: string
) {
  const companyId = await getCompanyId();

  try {
    const whereConditions: Prisma.ClientWhereInput[] = [{ companyId }];

    if (params.where) {
      whereConditions.push(params.where);
    }

    if (search) {
      const [first, last] = search.trim().split(" ");

      whereConditions.push({
        OR: [
          {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            AND: [
              first
                ? {
                    firstName: {
                      contains: first,
                      mode: "insensitive",
                    },
                  }
                : {},
              last
                ? {
                    lastName: {
                      contains: last,
                      mode: "insensitive",
                    },
                  }
                : {},
            ],
          },
        ],
      });
    }

    const clients = await db.client.findMany({
      ...params,
      where: {
        AND: whereConditions,
      },
    });

    return clients;
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw new Error("Failed to get clients");
  }
}
