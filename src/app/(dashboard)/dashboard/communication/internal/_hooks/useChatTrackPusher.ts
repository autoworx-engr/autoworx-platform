import { pusher } from "@/lib/pusher/client";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import type { ChatTrack, Group, Message, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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
  // Refs keep the Pusher handlers reading the *latest* userState / sortLists
  // even though the effect only re-subscribes when sessionUserId changes.
  // Without this, handlers capture stale values from first render.
  const userStateRef = useRef(userState);
  const sortListsRef = useRef(sortLists);
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);
  useEffect(() => {
    sortListsRef.current = sortLists;
  }, [sortLists]);

  const queryClient = useQueryClient();

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
        // Re-sort so the active group floats up; also invalidate the groups
        // infinite query so each row's `unreadCount` (per-viewer) refreshes
        // from the server. Pages currently rendered will refetch in place.
        setSideBarGroupLists((prevGroups) => {
          const { sortedGroups } = sortListsRef.current(
            userStateRef.current,
            prevGroups,
          );
          return sortedGroups;
        });
        queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === "internal" &&
            q.queryKey[1] === "groups",
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
      // Capture the prior per-user count so we can shrink the side-nav
      // global counter by exactly that amount — handles cross-tab reads
      // (user clears the conversation on another tab/device).
      const priorUnread =
        userStateRef.current.find((u) => u.id === data.senderId)?.unreadCount ??
        0;
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
      if (priorUnread > 0) {
        const store = useChatTrackStore.getState();
        store.setUnreadMessageCount({
          ...store.unreadMessageCount,
          internalCount: Math.max(
            0,
            store.unreadMessageCount.internalCount - priorUnread,
          ),
        });
      }
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
