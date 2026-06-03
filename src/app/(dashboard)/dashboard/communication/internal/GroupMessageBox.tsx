import {
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import MessageBox from "../MessageBox";
import { useSession } from "next-auth/react";
import { pusher } from "@/lib/pusher/client";
import { Attachment, Group, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteGroupMessages } from "./_hooks/useInfiniteGroupMessages";
import { useReverseScrollPagination } from "./_hooks/useReverseScrollPagination";
import { usePrependToInfiniteCache } from "./_hooks/useMessageCacheMutation";
import { internalKeys } from "./_utils/queryKey";
import { Spinner } from "@/components/ui/spinner";
import { markGroupAsRead } from "@/actions/communication/internal/markGroupAsRead";
import type { GroupMessageSender } from "@/actions/communication/internal/query";

type TProps = {
  setGroupsList: React.Dispatch<
    React.SetStateAction<(Group & { users: User[] })[]>
  >;
  existingGroups: Array<Group & { users: User[] }>;
  totalMessageBox: number;
  group: Group & { users: User[] };
};

export default function GroupMessageBox({
  group,
  totalMessageBox,
  setGroupsList,
  existingGroups,
}: TProps) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : NaN;
  const queryClient = useQueryClient();
  const prependToCache = usePrependToInfiniteCache(
    internalKeys.groupMessages(group.id),
  );

  // Mark the group as read whenever this box is mounted (the viewer opened
  // the chat) and whenever a new message arrives while they're looking at
  // it. Server upserts `GroupReadState.lastSeenAt = now`; the sidebar
  // groups query is then invalidated so the unread badge updates.
  const invalidateGroupsList = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "internal" &&
        q.queryKey[1] === "groups",
    });
  }, [queryClient]);
  useEffect(() => {
    if (!Number.isFinite(sessionUserId)) return;
    void markGroupAsRead(group.id).then(invalidateGroupsList);
  }, [group.id, sessionUserId, invalidateGroupsList]);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteGroupMessages({
      groupId: group.id,
      enabled: Number.isFinite(sessionUserId),
    });

  const groupMessages = useMemo(() => {
    const flat = data?.pages?.flatMap((p) => p.data) ?? [];
    return [...flat].reverse().map((m) => ({
      id: m.id,
      groupId: m.groupId,
      userId: m.from,
      message: m.message,
      sender: (m.from === sessionUserId ? "USER" : "CLIENT") as
        | "USER"
        | "CLIENT",
      attachment: m.attachment,
      createdAt: m.createdAt,
      senderInfo: (m as { sender?: GroupMessageSender | null }).sender ?? null,
    }));
  }, [data, sessionUserId]);

  const messagesRef = useRef(groupMessages);
  useEffect(() => {
    messagesRef.current = groupMessages;
  }, [groupMessages]);

  const setGroupMessages: React.Dispatch<SetStateAction<any[]>> = useCallback(
    (action) => {
      const next =
        typeof action === "function"
          ? (action as (prev: any[]) => any[])(messagesRef.current)
          : action;
      const last = next[next.length - 1];
      if (!last) return;

      prependToCache({
        id: last.id ?? Date.now(),
        groupId: group.id,
        from: last.userId ?? sessionUserId,
        message: last.message,
        createdAt: last.createdAt ?? new Date(),
        attachment: Array.isArray(last.attachment)
          ? last.attachment
          : last.attachment
            ? [last.attachment]
            : [],
      });
    },
    [prependToCache, group.id, sessionUserId],
  );

  useEffect(() => {
    const channel = pusher.subscribe(`group-${group.id}`);
    const handler = ({
      groupId,
      from,
      message,
      attachment,
    }: {
      groupId: number;
      from: number;
      message: string;
      attachment: Attachment | null;
    }) => {
      if (from === sessionUserId) return;
      prependToCache({
        id: Date.now(),
        groupId,
        from,
        message,
        createdAt: new Date(),
        attachment: attachment ? [attachment] : [],
      });
      // Box is open while the message arrives → keep lastSeenAt fresh so it
      // never appears as unread on the sidebar.
      void markGroupAsRead(group.id).then(invalidateGroupsList);
    };
    channel.bind("message", handler);
    return () => {
      channel.unbind("message", handler);
    };
  }, [prependToCache, group.id, sessionUserId, invalidateGroupsList]);

  // Reverse-pagination wiring.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);
  const isReady = !isLoading && groupMessages.length > 0;
  const { adjustAfterPagesChange } = useReverseScrollPagination({
    containerRef,
    hasNextPage: !!hasNextPage,
    fetchNextPage: () => fetchNextPage(),
    isFetchingNextPage,
    isReady,
  });

  useLayoutEffect(() => {
    adjustAfterPagesChange(data?.pages?.length ?? 0);
  }, [data?.pages?.length, adjustAfterPagesChange]);

  return (
    <MessageBox
      fromGroup
      group={group}
      section="internal"
      messages={groupMessages}
      setMessages={setGroupMessages}
      totalMessageBox={totalMessageBox}
      setGroupsList={setGroupsList}
      existingGroups={existingGroups}
      isLoadingOlder={isFetchingNextPage}
      isLoadingInitial={isLoading}
      onScrollContainerRef={setContainer}
      topSlot={
        isFetchingNextPage ? (
          <div className="flex items-center justify-center py-2">
            <Spinner />
          </div>
        ) : null
      }
    />
  );
}
