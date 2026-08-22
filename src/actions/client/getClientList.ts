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
      // Every word of the search must appear in firstName or lastName (in either
      // order/field), so a full "First Last" search still matches when the name
      // is split across the two fields differently than the search words are.
      const words = trimmedSearch.split(/\s+/).filter(Boolean);

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
            AND: words.map((word) => ({
              OR: [
                { firstName: { contains: word, mode: "insensitive" } },
                { lastName: { contains: word, mode: "insensitive" } },
              ],
            })),
          },
          {
            email: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
          {
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
