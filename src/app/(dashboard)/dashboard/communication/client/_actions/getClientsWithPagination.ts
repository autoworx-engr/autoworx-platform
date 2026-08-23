"use server";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { Client, ClientConversationTrack, Prisma } from "@prisma/client";
import { cache } from "react";
import { clientSortByUpdatedMessage } from "../_utils";

type TGetClientsProps = {
  companyId: number;
  userId?: number;
  filter?: string;
  search?: string;
  take?: number;
  page?: number;
};

export const getClientsWithPagination = cache(
  async ({
    companyId,
    filter,
    search,
    take = 20,
    page = 1,
    userId,
  }: TGetClientsProps) => {
    const user = await getUserFromSession(userId);

    const skip = (page - 1) * take;

    const baseWhere: Prisma.ClientWhereInput = {
      companyId,
    };

    const searchTerm = search?.trim();
    if (searchTerm) {
      const tokens = searchTerm.split(/\s+/).filter(Boolean);
      baseWhere.AND = tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" } },
          { lastName: { contains: token, mode: "insensitive" } },
          { email: { contains: token, mode: "insensitive" } },
          { mobile: { contains: token, mode: "insensitive" } },
        ],
      }));
    }

    const queryObj: Prisma.ClientFindManyArgs = {
      where: baseWhere,
      include: {
        conversationsTrack: true,
      },
    };

    try {
      let allClients: any[] = [];

      switch (filter) {
        case "Unread":
          allClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              conversationsTrack: {
                OR: [
                  { emailIsRead: false },
                  { smsIsRead: false },
                  { messengerIsRead: false },
                  { instagramIsRead: false },
                ],
              },
            },
          });
          break;

        case "Starred":
          allClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              isStarred: true,
            },
          });
          break;

        case "Assigned":
          allClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              Lead: {
                assignedSalesUserId: {
                  in: [Number(user.id)],
                },
              },
            },
          });
          break;

        default:
          allClients = await db.client.findMany(queryObj);
      }

      // 🔥 JS-level sorting
      const sortedClients = clientSortByUpdatedMessage(allClients);

      // ✅ Proper pagination
      const paginatedClients = sortedClients.slice(skip, skip + take);

      return {
        data: paginatedClients,
        meta: {
          page,
          take,
          total: sortedClients.length,
          totalPages: Math.ceil(sortedClients.length / take),
          hasNextPage: skip + take < sortedClients.length,
        },
      };
    } catch (err) {
      console.error("getClients error:", err);
      throw err;
    }
  },
);
