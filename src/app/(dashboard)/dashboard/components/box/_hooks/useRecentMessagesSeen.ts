import { pusher } from "@/lib/pusher/client";
import type { ClientConversationTrack, Message } from "@prisma/client";
import { useEffect } from "react";

type SeenSetter<T> = React.Dispatch<React.SetStateAction<T[]>>;

type Args<
  TInternal extends { isSeen: boolean },
  TClient extends { id: number },
> = {
  userId?: number;
  companyId?: number | null;
  setInternalMessages: SeenSetter<TInternal>;
  setClientMessages: SeenSetter<TClient>;
  counterpartId: (message: TInternal) => number | undefined;
};

/**
 * Keeps the dashboard box's seen/unseen styling in sync without a refresh.
 *
 * Internal rows follow the same `track-${userId}` stream the Communications
 * Hub sidebar uses: `chat-track-read` when the viewer opens a conversation
 * (on any tab or device), `chat-track` when a new message lands. Client rows
 * follow `client-notify-${companyId}`, whose payload is the conversation
 * track the seen flag is derived from.
 */
export function useRecentMessagesSeen<
  TInternal extends { isSeen: boolean },
  TClient extends { id: number },
>({
  userId,
  companyId,
  setInternalMessages,
  setClientMessages,
  counterpartId,
}: Args<TInternal, TClient>) {
  useEffect(() => {
    if (!userId) return;
    const channel = pusher.subscribe(`track-${userId}`);

    const setSeenFor = (otherUserId: number, isSeen: boolean) =>
      setInternalMessages((prev) =>
        prev.map((message) =>
          counterpartId(message) === otherUserId && message.isSeen !== isSeen
            ? { ...message, isSeen }
            : message,
        ),
      );

    const handleRead = (data: { senderId: number; userId: number }) => {
      if (data.userId !== userId) return;
      setSeenFor(data.senderId, true);
    };

    const handleNewMessage = (data: { message?: Message | null }) => {
      const incoming = data?.message;
      if (!incoming || incoming.to !== userId) return;
      setSeenFor(incoming.from, false);
    };

    // Unbind only — never unsubscribe. `track-${userId}` is shared with the
    // side navbar's unread badge, and unsubscribing would tear that down too.
    channel.bind("chat-track-read", handleRead);
    channel.bind("chat-track", handleNewMessage);
    return () => {
      channel.unbind("chat-track-read", handleRead);
      channel.unbind("chat-track", handleNewMessage);
    };
  }, [userId, setInternalMessages, counterpartId]);

  useEffect(() => {
    if (!companyId) return;
    const channelName = `client-notify-${companyId}`;
    const channel = pusher.subscribe(channelName);

    const handleClientNotify = (track: ClientConversationTrack) => {
      if (!track) return;
      const isSeen =
        track.emailIsRead &&
        track.smsIsRead &&
        track.messengerIsRead &&
        track.instagramIsRead;

      setClientMessages((prev) =>
        prev.map((client) =>
          client.id === track.clientId ? { ...client, isSeen } : client,
        ),
      );
    };

    channel.bind("client-notify", handleClientNotify);
    return () => {
      channel.unbind("client-notify", handleClientNotify);
    };
  }, [companyId, setClientMessages]);
}
