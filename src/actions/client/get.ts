"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type TGetClientsParams = {
  search?: string;
  currentPage?: number;
  pageSize?: number;
};

export default async function getClients({
  search = "",
  currentPage = 1,
  pageSize = 50,
}: TGetClientsParams) {
  try {
    const companyId = await getCompanyId();
    const whereConditions: Prisma.ClientWhereInput = {
      companyId,
    };

    if (search) {
      const [first, last] = search.trim().split(" ");
      whereConditions.OR = [
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
        {
          mobile: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const clients = await db.client.findMany({
      where: whereConditions,
      include: {
        tag: {
          where: {
            type: "CLIENT",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });

    const totalClients = await db.client.count({
      where: whereConditions,
    });

    return { clients, totalClients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw new Error("Failed to get clients");
  }
}
