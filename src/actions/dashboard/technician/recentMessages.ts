"use server";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { Attachment, Group, User as PrismaUser, User } from "@prisma/client";

export interface FullMessage {
  id: number;
  to: PrismaUser | null; // Full user object instead of ID
  from: PrismaUser | null; // Full user object instead of ID
  message: string;
  groupId: number | null;
  requestEstimateId: number | null;
  createdAt: Date;
  updatedAt: Date;
  attachment: Attachment[] | null;
  group: Group | null;
}

export const fetchRecentMessages = async (
  take?: number,
  currentUser?: User,
): Promise<FullMessage[]> => {
  try {
    const user = currentUser || (await getUser());

    const messages = await db.message.findMany({
      where: {
        OR: [{ from: user.id }, { to: user.id }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        attachment: true,
        group: true,
      },
      take: take,
    });

    const uniqueMessages: FullMessage[] = [];
    const seenClients = new Set<number>();

    for (const message of messages) {
      const otherUser = message.from === user.id ? message?.to : message.from;

      if (otherUser && !seenClients.has(otherUser)) {
        seenClients.add(otherUser);
        uniqueMessages.push({
          ...message,
          from:
            message.from === user.id
              ? user
              : await db.user.findFirst({
                  where: { id: message.from },
                }),
          to: message.to
            ? await db.user.findFirst({ where: { id: message.to } })
            : null,
        });
      }

      if (uniqueMessages.length === 20) break;
    }

    return uniqueMessages;
  } catch (error) {
    console.error("Error fetching recent messages:", error);
    throw new Error("Failed to fetch recent messages");
  }
};
