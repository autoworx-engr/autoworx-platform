import { getGroupById } from "@/actions/communication/internal/query";
import { pusher } from "@/lib/pusher/client";
import type { Group, Message, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };

type Args = {
  sessionUserId: number | null;
  userState: TUser[];
  setSideBarGroupLists: React.Dispatch<React.SetStateAction<TGroup[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
  sortLists: (
    users: TUser[],
    groups: TGroup[],
  ) => { sortedUsers: TUser[]; sortedGroups: TGroup[] };
};

/**
 * Group lifecycle pusher subscriptions:
 *   - `create-group`        → a new group exists
 *   - `delete-group`        → a member was removed (or group dissolved)
 *   - `add-member-in-group` → a member was added to a group
 *
 * All three resolve the latest group state through `getGroupById`, which
 * returns null when the viewer is no longer a member.
 */
export function useGroupLifecyclePusher({
  sessionUserId,
  userState,
  setSideBarGroupLists,
  setGroupsList,
  sortLists,
}: Args) {
  // Refs so the Pusher handlers always read the latest userState and the
  // current `sortLists` closure, instead of the values captured at first
  // subscribe. Without this, handlers would sort with stale user data.
  const userStateRef = useRef(userState);
  const sortListsRef = useRef(sortLists);
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);
  useEffect(() => {
    sortListsRef.current = sortLists;
  }, [sortLists]);

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

  // create
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    const channel = pusher.subscribe("create-group");
    const handler = ({ groupId }: { groupId: number }) => {
      getGroupById(groupId, sessionUserId).then((groupFromDb) => {
        if (!groupFromDb || !live) return;
        setSideBarGroupLists((prev) => {
          const exists = prev.find((g) => g.id === groupId);
          const updated = exists ? prev : [...prev, groupFromDb];
          const { sortedGroups } = sortListsRef.current(
            userStateRef.current,
            updated,
          );
          return sortedGroups;
        });
        invalidateGroups();
      });
    };
    channel.bind("create", handler);
    return () => {
      live = false;
      channel.unbind("create", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);

  // delete-member / dissolve
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    const channel = pusher.subscribe("delete-group");
    const handler = ({ groupId }: { groupId: number }) => {
      getGroupById(groupId, sessionUserId).then((groupFromDb) => {
        if (!live) return;
        if (groupFromDb) {
          setSideBarGroupLists((prev) => {
            const exists = prev.find((g) => g.id === groupId);
            const updated = exists
              ? prev.map((g) => (g.id === groupId ? groupFromDb : g))
              : prev;
            const { sortedGroups } = sortListsRef.current(
              userStateRef.current,
              updated,
            );
            return sortedGroups;
          });
          setGroupsList((prev) =>
            prev.map((g) => (g.id === groupId ? groupFromDb : g)),
          );
        } else {
          setSideBarGroupLists((prev) => prev.filter((g) => g.id !== groupId));
          setGroupsList((prev) => prev.filter((g) => g.id !== groupId));
        }
        invalidateGroups();
      });
    };
    channel.bind("delete", handler);
    return () => {
      live = false;
      channel.unbind("delete", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);

  // add-member
  useEffect(() => {
    if (!sessionUserId) return;
    let live = true;
    const channel = pusher.subscribe("add-member-in-group");
    const handler = ({ groupId }: { groupId: number }) => {
      getGroupById(groupId, sessionUserId).then((groupFromDb) => {
        if (!groupFromDb || !live) return;
        setSideBarGroupLists((prev) => {
          const exists = prev.find((g) => g.id === groupId);
          const updated = exists
            ? prev.map((g) => (g.id === groupId ? groupFromDb : g))
            : [...prev, groupFromDb];
          const { sortedGroups } = sortListsRef.current(
            userStateRef.current,
            updated,
          );
          return sortedGroups;
        });
        setGroupsList((prev) =>
          prev.map((g) => (g.id === groupId ? groupFromDb : g)),
        );
        invalidateGroups();
      });
    };
    channel.bind("add-member", handler);
    return () => {
      live = false;
      channel.unbind("add-member", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);
}
