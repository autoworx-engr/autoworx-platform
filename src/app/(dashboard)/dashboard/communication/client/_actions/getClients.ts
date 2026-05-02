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
};

export const getClients = cache(
  async ({
    companyId,
    filter,
    search,
    take = 20,
    userId,
  }: TGetClientsProps) => {
    const user = await getUserFromSession(userId);

    // Base query object
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

    // Over-fetch a small multiple of `take` so the JS multi-priority sort still
    // has enough candidates near the top, without scanning the whole table.
    const dbTake = Math.max(take * 3, 60);

    // Always order by latest conversation activity at the DB layer first; the
    // JS sort refines tiebreakers on this small page.
    const dbOrderBy: Prisma.ClientOrderByWithRelationInput[] = [
      { conversationsTrack: { sendAt: "desc" } },
      { conversationsTrack: { updatedAt: "desc" } },
      { createdAt: "desc" },
    ];

    const queryObj: Prisma.ClientFindManyArgs = {
      where: baseWhere,
      include: {
        conversationsTrack: true,
      },
      orderBy: dbOrderBy,
      take: dbTake,
    };
    let clients: (Client & { conversationsTrack?: ClientConversationTrack })[] =
      [];
    try {
      switch (filter) {
        case "Unread": {
          const unreadClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              conversationsTrack: {
                OR: [{ emailIsRead: false }, { smsIsRead: false }],
              },
            },
          });
          clients = clientSortByUpdatedMessage(unreadClients).slice(
            0,
            take,
          ) as typeof clients;
          break;
        }
        case "Starred": {
          const starredClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              isStarred: true,
            },
          });
          clients = clientSortByUpdatedMessage(starredClients).slice(
            0,
            take,
          ) as typeof clients;
          break;
        }
        case "Assigned": {
          const assignedClients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              Lead: {
                assignedSalesUserId: {
                  in: [parseInt(user.id)],
                },
              },
            },
          });
          clients = clientSortByUpdatedMessage(assignedClients).slice(
            0,
            take,
          ) as typeof clients;
          break;
        }
        default: {
          const candidateClients = await db.client.findMany(queryObj);
          clients = clientSortByUpdatedMessage(candidateClients).slice(
            0,
            take,
          ) as typeof clients;
          break;
        }
      }
      return clients || [];
    } catch (err) {
      console.error("getClients: Error occurred:", err);
      throw err;
    }
  },
);
