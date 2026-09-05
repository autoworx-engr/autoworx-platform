import { db } from "@/lib/db";
import { FullMessage } from "@/actions/dashboard/technician/recentMessages";

export type WithSeen<T> = T & { isSeen: boolean };

export async function attachInternalSeenState(
  messages: FullMessage[],
  userId: number,
): Promise<WithSeen<FullMessage>[]> {
  const senderIds = Array.from(
    new Set(
      messages
        .filter((message) => message.to?.id === userId && message.from)
        .map((message) => message.from!.id),
    ),
  );

  const unreadTracks = senderIds.length
    ? await db.chatTrack.findMany({
        where: {
          receiverId: userId,
          senderId: { in: senderIds },
          section: "internal",
          isRead: false,
        },
        select: { senderId: true },
      })
    : [];

  const unreadSenderIds = new Set(
    unreadTracks
      .map((track) => track.senderId)
      .filter((id): id is number => id !== null),
  );

  return messages.map((message) => ({
    ...message,
    isSeen: !(
      message.to?.id === userId &&
      !!message.from &&
      unreadSenderIds.has(message.from.id)
    ),
  }));
}

export async function attachClientSeenState<T extends { id: number }>(
  clients: T[],
): Promise<WithSeen<T>[]> {
  if (clients.length === 0) return [];

  const tracks = await db.clientConversationTrack.findMany({
    where: { clientId: { in: clients.map((client) => client.id) } },
    select: {
      clientId: true,
      emailIsRead: true,
      smsIsRead: true,
      messengerIsRead: true,
      instagramIsRead: true,
    },
  });

  const unseenClientIds = new Set(
    tracks
      .filter(
        (track) =>
          !track.emailIsRead ||
          !track.smsIsRead ||
          !track.messengerIsRead ||
          !track.instagramIsRead,
      )
      .map((track) => track.clientId),
  );

  return clients.map((client) => ({
    ...client,
    isSeen: !unseenClientIds.has(client.id),
  }));
}
