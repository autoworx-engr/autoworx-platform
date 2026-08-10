import type { ChatTrack, Group, Message, User } from "@prisma/client";
import { useCallback } from "react";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };
type LastMessageState =
  | (ChatTrack & { message?: Message | null })
  | null
  | undefined;

type CombinedItem =
  | {
      type: "user";
      data: TUser;
      latestMessage: Message | null | undefined;
      timestamp: number;
    }
  | {
      type: "group";
      data: TGroup;
      latestMessage: Message | null;
      timestamp: number;
    };

/**
 * Sort utility for the internal sidebar. Pulls the rate-limited sorting logic
 * out of `List.tsx` so the component file is dramatically smaller and the
 * memoization story is easier to follow.
 *
 * Both `sortLists` (separate returns for users/groups) and
 * `buildCombinedSortedList` (interleaved, used for the rendered output) are
 * derived from the same scoring function — so the in-place sort and the
 * rendered list can never disagree on ordering.
 */
export function useSortedChatList(
  messagesState: Message[],
  lastMessage: LastMessageState,
  sessionUserId: number | null,
) {
  const messageForUser = useCallback(
    (user: TUser) => {
      if (sessionUserId == null) return user.latestMessage ?? null;
      const userMessages = messagesState.filter(
        (m) =>
          (m.from === user.id && m.to === sessionUserId) ||
          (m.from === sessionUserId && m.to === user.id),
      );
      return userMessages.length > 0
        ? userMessages[0]
        : (user.latestMessage ?? null);
    },
    [messagesState, sessionUserId],
  );

  const messageForGroup = useCallback(
    (group: TGroup) => {
      const groupMessages = messagesState.filter((m) => m.groupId === group.id);
      return groupMessages.length > 0 ? groupMessages[0] : null;
    },
    [messagesState],
  );

  const applyLiveLastMessageBoost = useCallback(
    (item: CombinedItem) => {
      if (!lastMessage?.message || sessionUserId == null) return item.timestamp;
      const lm = lastMessage.message;
      const boost = new Date(lm.updatedAt).getTime();

      if (item.type === "user") {
        const matches =
          (lm.from === item.data.id && lm.to === sessionUserId) ||
          (lm.from === sessionUserId && lm.to === item.data.id);
        return matches ? Math.max(item.timestamp, boost) : item.timestamp;
      }
      return lm.groupId === item.data.id
        ? Math.max(item.timestamp, boost)
        : item.timestamp;
    },
    [lastMessage, sessionUserId],
  );

  const compareTimestamps = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    if (a === 0) return 1;
    if (b === 0) return -1;
    return b - a;
  };

  const sortLists = useCallback(
    (usersToSort: TUser[], groupsToSort: TGroup[]) => {
      const combined: CombinedItem[] = [
        ...usersToSort.map((u) => {
          const lm = messageForUser(u);
          return {
            type: "user" as const,
            data: u,
            latestMessage: lm,
            timestamp: lm ? new Date(lm.updatedAt).getTime() : 0,
          };
        }),
        ...groupsToSort.map((g) => {
          const lm = messageForGroup(g);
          return {
            type: "group" as const,
            data: g,
            latestMessage: lm,
            timestamp: lm ? new Date(lm.updatedAt).getTime() : 0,
          };
        }),
      ];

      combined.forEach((item) => {
        item.timestamp = applyLiveLastMessageBoost(item);
      });

      combined.sort((a, b) => compareTimestamps(a.timestamp, b.timestamp));

      const sortedUsers = combined
        .filter(
          (i): i is Extract<CombinedItem, { type: "user" }> =>
            i.type === "user",
        )
        .map((i) => i.data);
      const sortedGroups = combined
        .filter(
          (i): i is Extract<CombinedItem, { type: "group" }> =>
            i.type === "group",
        )
        .map((i) => i.data);

      return { sortedUsers, sortedGroups };
    },
    [messageForUser, messageForGroup, applyLiveLastMessageBoost],
  );

  const buildCombinedSortedList = useCallback(
    (usersToSort: TUser[], groupsToSort: TGroup[]): CombinedItem[] => {
      const combined: CombinedItem[] = [
        ...groupsToSort.map((g) => {
          const lm = messageForGroup(g);
          return {
            type: "group" as const,
            data: g,
            latestMessage: lm,
            timestamp: lm ? new Date(lm.updatedAt).getTime() : 0,
          };
        }),
        ...usersToSort.map((u) => {
          const lm = messageForUser(u);
          return {
            type: "user" as const,
            data: u,
            latestMessage: lm,
            timestamp: lm ? new Date(lm.updatedAt).getTime() : 0,
          };
        }),
      ];

      combined.forEach((item) => {
        item.timestamp = applyLiveLastMessageBoost(item);
      });

      return combined.sort((a, b) =>
        compareTimestamps(a.timestamp, b.timestamp),
      );
    },
    [messageForUser, messageForGroup, applyLiveLastMessageBoost],
  );

  return { sortLists, buildCombinedSortedList };
}

export type { CombinedItem };
