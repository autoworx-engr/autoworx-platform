import { getGroupById } from "@/actions/communication/internal/query";
import { pusher } from "@/lib/pusher/client";
import type { ChatTrack, Group, Message, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };
type TChatTrackEvent = ChatTrack & { message?: Message | null };

type PusherSidebarArgs = {
  sessionUserId: number | null;
  userState: TUser[];
  setUserState: React.Dispatch<React.SetStateAction<TUser[]>>;
  setSideBarGroupLists: React.Dispatch<React.SetStateAction<TGroup[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
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
 * Wires up the four Pusher subscriptions that the internal sidebar listens to:
 *   - `track-${sessionUserId}` → new chat-track + message-read events
 *   - `create-group`           → a group was just created
 *   - `delete-group`           → a member was removed (or group dissolved)
 *   - `add-member-in-group`    → a member was added to a group
 *
 * All four were previously inline `useEffect`s in `List.tsx` with their own
 * `// eslint-disable-line react-hooks/exhaustive-deps` markers. Centralizing
 * them here keeps List.tsx focused on rendering.
 */
export function useInternalSidebarPusher({
  sessionUserId,
  userState,
  setUserState,
  setSideBarGroupLists,
  setGroupsList,
  setMessagesState,
  setChatTrackState,
  sortLists,
}: PusherSidebarArgs) {
  const queryClient = useQueryClient();
  // The infinite-query groups feed is keyed `["internal","groups",companyId,search]`.
  // We don't have companyId/search here, so invalidate the whole namespace via
  // predicate — react-query refetches the active page on next paint.
  const invalidateGroups = () =>
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "internal" &&
        q.queryKey[1] === "groups",
    });
  // Personal chat-track stream
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
        setUserState((prev) =>
          prev.map((u) =>
            u.id === incoming.from
              ? { ...u, unreadCount: 1, latestMessage: incoming }
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

  // Group lifecycle: create
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    pusher
      .subscribe("create-group")
      .bind(
        "create",
        ({ groupId }: { groupId: number; usersIds: { id: number }[] }) => {
          getGroupById(groupId, sessionUserId).then((groupFromDb) => {
            if (!groupFromDb || !live) return;
            setSideBarGroupLists((prev) => {
              const exists = prev.find((g) => g.id === groupId);
              const updated = exists ? prev : [...prev, groupFromDb];
              const { sortedGroups } = sortLists(userState, updated);
              return sortedGroups;
            });
            invalidateGroups();
          });
        },
      );
    return () => {
      live = false;
      pusher.unbind("create");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);

  // Group lifecycle: delete-member / dissolve
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    pusher
      .subscribe("delete-group")
      .bind("delete", ({ groupId }: { groupId: number; userId: number }) => {
        getGroupById(groupId, sessionUserId).then((groupFromDb) => {
          if (!live) return;
          if (groupFromDb) {
            setSideBarGroupLists((prev) => {
              const exists = prev.find((g) => g.id === groupId);
              const updated = exists
                ? prev.map((g) => (g.id === groupId ? groupFromDb : g))
                : prev;
              const { sortedGroups } = sortLists(userState, updated);
              return sortedGroups;
            });
            setGroupsList((prev) =>
              prev.map((g) => (g.id === groupId ? groupFromDb : g)),
            );
          } else {
            setSideBarGroupLists((prev) =>
              prev.filter((g) => g.id !== groupId),
            );
            setGroupsList((prev) => prev.filter((g) => g.id !== groupId));
          }
          invalidateGroups();
        });
      });
    return () => {
      live = false;
      pusher.unbind("delete");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);

  // Group lifecycle: add-member
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    pusher
      .subscribe("add-member-in-group")
      .bind("add-member", ({ groupId }: { groupId: number }) => {
        getGroupById(groupId, sessionUserId).then((groupFromDb) => {
          if (!groupFromDb || !live) return;
          setSideBarGroupLists((prev) => {
            const exists = prev.find((g) => g.id === groupId);
            const updated = exists
              ? prev.map((g) => (g.id === groupId ? groupFromDb : g))
              : [...prev, groupFromDb];
            const { sortedGroups } = sortLists(userState, updated);
            return sortedGroups;
          });
          setGroupsList((prev) =>
            prev.map((g) => (g.id === groupId ? groupFromDb : g)),
          );
          invalidateGroups();
        });
      });
    return () => {
      live = false;
      pusher.unbind("add-member");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);
}
