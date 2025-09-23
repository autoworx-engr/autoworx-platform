"use server";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { Client, ClientConversationTrack, Prisma } from "@prisma/client";
import { cache } from "react";
import { clientSortByUpdatedMessage } from "../_utils";

type TGetClientsProps = {
  companyId: number;
  filter?: string;
  search?: string;
  take?: number;
};

export const getClients = cache(
  async ({ companyId, filter, search, take = 20 }: TGetClientsProps) => {
    const user = await getUserFromSession();
    const queryObj: Prisma.ClientFindManyArgs = {
      where: {
        companyId,
      },
      // Remove the complex orderBy and handle sorting in application code
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
                OR: [{ emailIsRead: false }, { smsIsRead: false }],
              },
            },
          });
          const sortedUnreadClients = clientSortByUpdatedMessage(allUnreadClients);
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
          const sortedStarredClients = clientSortByUpdatedMessage(allStarredClients);
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
          const sortedAssignedClients = clientSortByUpdatedMessage(allAssignedClients);
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

      if (!clients || clients.length === 0) {
        return [];
      }

      if (search) {
        const getAllClients = await db.client.findMany({ ...queryObj });
        clients = getAllClients.filter((client) => {
          const fullName = `${client.firstName} ${client.lastName}`;
          return (
            fullName.toLowerCase().includes(search.toLowerCase()) ||
            (client.email?.toLowerCase().includes(search.toLowerCase()) ??
              false) ||
            (client.mobile?.toLowerCase().includes(search.toLowerCase()) ??
              false)
          );
        });
        
        // Apply sorting for search results
        clients = clientSortByUpdatedMessage(clients) as typeof clients;
      }

      return clients;
    } catch (err) {
      throw err;
    }
  }
);
