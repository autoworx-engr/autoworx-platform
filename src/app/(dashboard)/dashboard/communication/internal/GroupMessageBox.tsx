import {
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import MessageBox from "../MessageBox";
import { getUserInGroup } from "@/actions/communication/internal/query";
import { useSession } from "next-auth/react";
import { pusher } from "@/lib/pusher/client";
import { Attachment, Group, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteGroupMessages } from "./_hooks/useInfiniteGroupMessages";
import { useReverseScrollPagination } from "./_hooks/useReverseScrollPagination";
import { internalKeys } from "./_utils/queryKey";
import { Spinner } from "@/components/ui/spinner";

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
  const queryClient = useQueryClient();
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : NaN;

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

      queryClient.setQueryData(
        internalKeys.groupMessages(group.id),
        (old: any) => {
          if (!old?.pages?.length) return old;
          const [firstPage, ...rest] = old.pages;
          if (last.id && firstPage.data.some((m: any) => m.id === last.id)) {
            return old;
          }
          const newRow = {
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
          };
          return {
            ...old,
            pages: [
              { ...firstPage, data: [newRow, ...firstPage.data] },
              ...rest,
            ],
          };
        },
      );
    },
    [queryClient, group.id, sessionUserId],
  );

  // Pusher real-time append (only for messages from other users — own
  // messages already arrive via the optimistic cache mutation in setMessages).
  useEffect(() => {
    const channel = pusher
      .subscribe(`group-${group.id}`)
      .bind(
        "message",
        async ({
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
          const isUserExistInGroup = await getUserInGroup(
            sessionUserId,
            groupId,
          );
          if (!isUserExistInGroup) {
            setGroupsList((groupList) =>
              groupList.filter((g) => g.id !== groupId),
            );
            return;
          }
          if (from === sessionUserId) return;

          queryClient.setQueryData(
            internalKeys.groupMessages(group.id),
            (old: any) => {
              if (!old?.pages?.length) return old;
              const [firstPage, ...rest] = old.pages;
              const newRow = {
                id: Date.now(),
                groupId,
                from,
                message,
                createdAt: new Date(),
                attachment: attachment ? [attachment] : [],
              };
              return {
                ...old,
                pages: [
                  { ...firstPage, data: [newRow, ...firstPage.data] },
                  ...rest,
                ],
              };
            },
          );
        },
      );

    return () => {
      channel.unbind("message");
    };
  }, [queryClient, group.id, sessionUserId, setGroupsList]);

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
  // useLayoutEffect so the scroll correction runs synchronously before paint —
  // no visible position jump when older messages are prepended. Because
  // adjustAfterPagesChange now has a stable identity (ref-based, not state),
  // this effect fires ONLY when pages.length actually changes.
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
