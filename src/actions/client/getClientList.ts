"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getClientList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any> = {},
  search?: string,
) {
  try {
    const companyId = await getCompanyId();
    const whereConditions: Prisma.ClientWhereInput[] = [{ companyId }];

    if (params.where) {
      whereConditions.push(params.where as Prisma.ClientWhereInput);
    }

    const trimmedSearch = search?.trim();

    if (trimmedSearch) {
      const [first, last] = trimmedSearch.split(" ");

      whereConditions.push({
        OR: [
          {
            firstName: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: trimmedSearch,
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
          {
            email: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
            mobile: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clients = await (db.client.findMany as any)({
      ...params,
      where: {
        AND: whereConditions,
      },
    });

    return { clients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw new Error("Failed to get clients");
  }
}
