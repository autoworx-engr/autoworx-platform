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
      whereConditions.OR = search
        .split(" ")
        .flatMap(searchText => [
          { firstName: { contains: searchText } },
          { lastName: { contains: searchText } },
          { email: { contains: searchText } },
          { mobile: { contains: searchText } },
        ]);
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
