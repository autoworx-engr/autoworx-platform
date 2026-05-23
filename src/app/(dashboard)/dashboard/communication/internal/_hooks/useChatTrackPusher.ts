import { pusher } from "@/lib/pusher/client";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import type { ChatTrack, Group, Message, User } from "@prisma/client";
import { useEffect } from "react";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };
type TChatTrackEvent = ChatTrack & { message?: Message | null };

type Args = {
  sessionUserId: number | null;
  userState: TUser[];
  setUserState: React.Dispatch<React.SetStateAction<TUser[]>>;
  setSideBarGroupLists: React.Dispatch<React.SetStateAction<TGroup[]>>;
  setMessagesState: React.Dispatch<React.SetStateAction<Message[]>>;
  setChatTrackState: React.Dispatch<
    React.SetStateAction<(ChatTrack & { message?: Message | null })[]>
  >;
  sortLists: (
    users: TUser[],
    groups: TGroup[],
  ) => { sortedUsers: TUser[]; sortedGroups: TGroup[] };
};

/**
 * Personal chat-track stream: `track-${sessionUserId}` channel. Handles both
 * new-message arrivals (`chat-track`) and read receipts (`chat-track-read`).
 */
export function useChatTrackPusher({
  sessionUserId,
  userState,
  setUserState,
  setSideBarGroupLists,
  setMessagesState,
  setChatTrackState,
  sortLists,
}: Args) {
  useEffect(() => {
    if (!sessionUserId) return;
    const channel = pusher.subscribe(`track-${sessionUserId}`);

    const handleNewMessage = (data: TChatTrackEvent) => {
      const involvesCurrentUser =
        !!data.message &&
        (data.message.to === sessionUserId ||
          data.message.from === sessionUserId);
      const isGroupForCurrentUser = !!data.message && !!data.message.groupId;

      if (!involvesCurrentUser && !isGroupForCurrentUser) return;
      if (!data.message) return;

      const incoming = data.message;

      setMessagesState((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [incoming, ...prev].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });

      if (incoming.groupId) {
        setSideBarGroupLists((prevGroups) => {
          const { sortedGroups } = sortLists(userState, prevGroups);
          return sortedGroups;
        });
      }

      if (incoming.to === sessionUserId) {
        // Centralised store bumps: previously each UserSelectButton row did
        // these in its own per-row pusher subscription. Doing it here once
        // avoids the N-row teardown bug and duplicate increments.
        const store = useChatTrackStore.getState();
        store.setLastMessage(data);
        store.setUnreadMessageCount({
          ...store.unreadMessageCount,
          internalCount: store.unreadMessageCount.internalCount + 1,
        });
        setUserState((prev) =>
          prev.map((u) =>
            u.id === incoming.from
              ? {
                  ...u,
                  unreadCount: (u.unreadCount ?? 0) + 1,
                  latestMessage: incoming,
                }
              : u,
          ),
        );
      } else if (incoming.from === sessionUserId) {
        setUserState((prev) =>
          prev.map((u) =>
            u.id === incoming.to ? { ...u, latestMessage: incoming } : u,
          ),
        );
      }

      setChatTrackState((prev) => {
        const idx = prev.findIndex((t) => t.id === data.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
    };

    const handleMessageRead = (data: { senderId: number; userId: number }) => {
      if (data.userId !== sessionUserId) return;
      setUserState((prev) =>
        prev.map((u) =>
          u.id === data.senderId ? { ...u, unreadCount: 0 } : u,
        ),
      );
      setChatTrackState((prev) =>
        prev.map((t) =>
          t.senderId === data.senderId && t.receiverId === data.userId
            ? { ...t, isRead: true }
            : t,
        ),
      );
    };

    channel.bind("chat-track", handleNewMessage);
    channel.bind("chat-track-read", handleMessageRead);
    return () => {
      channel.unbind("chat-track", handleNewMessage);
      channel.unbind("chat-track-read", handleMessageRead);
      pusher.unsubscribe(`track-${sessionUserId}`);
    };
    // userState is intentionally read at subscription time via closure; the
    // sort callback already captures the latest snapshot when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);
}
