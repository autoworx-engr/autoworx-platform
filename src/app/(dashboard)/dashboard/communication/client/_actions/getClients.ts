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

export const getClients = cache(async (props?: TGetClientsProps) => {
  if (!props?.companyId) return [];
  const { companyId, filter, search, take = 20, userId } = props;
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

  const queryObj: Prisma.ClientFindManyArgs = {
    where: baseWhere,
    include: {
      conversationsTrack: true,
    },
  };
  let clients: (Client & { conversationsTrack?: ClientConversationTrack })[] =
    [];
  try {
    switch (filter) {
      case "Unread":
        // Get all clients with unread messages, then sort and limit
        const allUnreadClients = await db.client.findMany({
          ...queryObj,
          where: {
            ...queryObj.where,
            conversationsTrack: {
              OR: [
                { emailIsRead: false },
                { smsIsRead: false },
                { messengerIsRead: false },
              ],
            },
          },
          orderBy: {
            conversationsTrack: {
              createdAt: "desc",
            },
          },
        });
        const sortedUnreadClients =
          clientSortByUpdatedMessage(allUnreadClients);
        clients = sortedUnreadClients.slice(0, take) as typeof clients;
        break;
      case "Starred":
        // Get all starred clients, then sort and limit
        const allStarredClients = await db.client.findMany({
          ...queryObj,
          where: {
            ...queryObj.where,
            isStarred: true,
          },
        });
        const sortedStarredClients =
          clientSortByUpdatedMessage(allStarredClients);
        clients = sortedStarredClients.slice(0, take) as typeof clients;
        break;
      case "Assigned":
        // Get all assigned clients, then sort and limit
        const allAssignedClients = await db.client.findMany({
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
        const sortedAssignedClients =
          clientSortByUpdatedMessage(allAssignedClients);
        clients = sortedAssignedClients.slice(0, take) as typeof clients;
        break;
      default:
        // For the initial load, we need to get ALL clients, sort them properly,
        // and then take the top 'take' number of clients
        // This ensures we get the actual top clients, not just a random 20
        const allClients = await db.client.findMany({
          ...queryObj,
          // Remove the 'take' limit here - we need all clients to sort properly
        });

        // Apply proper sorting to get the actual top clients
        const sortedAllClients = clientSortByUpdatedMessage(allClients);

        // Now take only the top 'take' number of clients
        clients = sortedAllClients.slice(0, take) as typeof clients;
        break;
    }
    return clients || [];
  } catch (err) {
    console.error("getClients: Error occurred:", err);
    throw err;
  }
});
