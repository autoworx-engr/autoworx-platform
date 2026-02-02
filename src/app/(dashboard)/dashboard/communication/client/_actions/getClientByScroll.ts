"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { clientSortByUpdatedMessage } from "../_utils";

type TGetClientByScrollProps = {
  skip: number;
  take: number;
  companyId?: number;
};

export const getClientByScroll = async ({
  skip,
  take,
  companyId,
}: TGetClientByScrollProps) => {
  try {
    const cId = companyId || (await getCompanyId());

    // For proper pagination with consistent sorting, we need to:
    // 1. Get all clients and sort them first
    // 2. Then apply pagination
    // This ensures the order is always consistent across pages

    const allClients = await db.client.findMany({
      where: {
        companyId: cId,
      },
      include: {
        conversationsTrack: true,
      },
    });

    // Apply proper sorting using the same logic as getClients
    const sortedClients = clientSortByUpdatedMessage(allClients);
    // Then apply pagination
    const paginatedClients = sortedClients.slice(skip, skip + take);

    return paginatedClients;
  } catch (err) {
    throw err;
  }
};
