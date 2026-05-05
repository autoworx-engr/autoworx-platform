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

    // Build the filter-specific where clause once, then push pagination and
    // ordering down to the database instead of fetching every match into memory.
    let where: Prisma.ClientWhereInput = baseWhere;
    switch (filter) {
      case "Unread":
        where = {
          ...baseWhere,
          conversationsTrack: {
            OR: [{ emailIsRead: false }, { smsIsRead: false }],
          },
        };
        break;
      case "Starred":
        where = { ...baseWhere, isStarred: true };
        break;
      case "Assigned":
        where = {
          ...baseWhere,
          Lead: { assignedSalesUserId: { in: [Number(user.id)] } },
        };
        break;
      default:
        // baseWhere is already correct
        break;
    }

    const orderBy: Prisma.ClientOrderByWithRelationInput[] = [
      { conversationsTrack: { sendAt: "desc" } },
      { conversationsTrack: { updatedAt: "desc" } },
      { createdAt: "desc" },
    ];

    try {
      const [pageClients, total] = await Promise.all([
        db.client.findMany({
          where,
          include: { conversationsTrack: true },
          orderBy,
          skip,
          take,
        }),
        db.client.count({ where }),
      ]);

      // Refine ordering on the small page (tiebreakers + has-messages priority).
      const paginatedClients = clientSortByUpdatedMessage(pageClients);

      return {
        data: paginatedClients,
        meta: {
          page,
          take,
          total,
          totalPages: Math.ceil(total / take),
          hasNextPage: skip + take < total,
        },
      };
    } catch (err) {
      console.error("getClients error:", err);
      throw err;
    }
  },
);
