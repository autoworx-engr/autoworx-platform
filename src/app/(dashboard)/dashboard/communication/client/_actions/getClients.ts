"use server";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { Client, ClientConversationTrack, Prisma } from "@prisma/client";
import { cache } from "react";

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
      orderBy: {
        conversationsTrack: {
          sendAt: "desc",
        },
      },
      include: {
        conversationsTrack: true,
      },
    };
    let clients: (Client & { conversationsTrack?: ClientConversationTrack })[] =
      [];
    try {
      switch (filter) {
        case "Unread":
          clients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              conversationsTrack: {
                OR: [{ emailIsRead: false }, { smsIsRead: false }],
              },
            },
          });
          break;
        case "Starred":
          clients = await db.client.findMany({
            ...queryObj,
            where: {
              ...queryObj.where,
              isStarred: true,
            },
          });
          break;
        case "Assigned":
          clients = await db.client.findMany({
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
          break;
        default:
          clients = await db.client.findMany({ ...queryObj, take });
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
      }

      return clients;
    } catch (err) {
      throw err;
    }
  }
);
