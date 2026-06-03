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
import { Attachment, RequestEstimate } from "@prisma/client";
import { pusher } from "@/lib/pusher/client";
import { useInfiniteUserMessages } from "./_hooks/useInfiniteUserMessages";
import { useReverseScrollPagination } from "./_hooks/useReverseScrollPagination";
import { usePrependToInfiniteCache } from "./_hooks/useMessageCacheMutation";
import { internalKeys } from "./_utils/queryKey";
import { Spinner } from "@/components/ui/spinner";
import type { PaginatedMessagesPage } from "@/actions/communication/internal/query";

type TProps = {
  user: any;
  setUsersList: React.Dispatch<SetStateAction<any[]>>;
  totalMessageBoxLength: number;
};

export default function UserMessageBox({
  user,
  setUsersList,
  totalMessageBoxLength,
}: TProps) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : NaN;
  const otherUserId: number = user?.id ?? NaN;
  const prependToCache = usePrependToInfiniteCache(
    internalKeys.userMessages(sessionUserId, otherUserId),
  );

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteUserMessages({
      currentUserId: sessionUserId,
      otherUserId,
      enabled: Number.isFinite(sessionUserId) && Number.isFinite(otherUserId),
    });

  // Pages come back newest-first; flatten then reverse so the rendered list is
  // oldest-at-top, newest-at-bottom (the way SmsBox does it).
  const messages = useMemo(() => {
    const flat = data?.pages?.flatMap((p) => p.data) ?? [];
    return [...flat].reverse().map((m) => ({
      id: m.id,
      message: m.message,
      sender: (m.from === sessionUserId ? "USER" : "CLIENT") as
        | "USER"
        | "CLIENT",
      attachment: m.attachment,
      requestEstimate: m.requestEstimate,
      createdAt: m.createdAt,
    }));
  }, [data, sessionUserId]);

  // Allow MessageBox to keep its `setMessages((prev) => [...prev, newMsg])`
  // contract while we actually persist into the react-query infinite cache.
  // Same pattern that the SMS chat uses.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setMessages: React.Dispatch<SetStateAction<any[]>> = useCallback(
    (action) => {
      const next =
        typeof action === "function"
          ? (action as (prev: any[]) => any[])(messagesRef.current)
          : action;
      const last = next[next.length - 1];
      if (!last) return;

      prependToCache({
        id: last.id ?? Date.now(),
        message: last.message,
        from: sessionUserId,
        to: otherUserId,
        createdAt: last.createdAt ?? new Date(),
        updatedAt: last.createdAt ?? new Date(),
        attachment: Array.isArray(last.attachment)
          ? last.attachment
          : last.attachment
            ? [last.attachment]
            : [],
        requestEstimate: last.requestEstimate ?? null,
      });
    },
    [prependToCache, sessionUserId, otherUserId],
  );

  // Pusher real-time append. Mutates the same cache instead of local state.
  useEffect(() => {
    const channel = pusher
      .subscribe(`user-${otherUserId}`)
      .bind(
        "message",
        ({
          to,
          from,
          message,
          groupId,
          attachment,
          requestEstimate,
        }: {
          to: number;
          from: number;
          groupId: number | null;
          message: string;
          attachment: Partial<Attachment> | Partial<Attachment>[];
          requestEstimate: RequestEstimate | null;
        }) => {
          if (to !== sessionUserId && !(from === sessionUserId && !groupId)) {
            return;
          }
          prependToCache({
            id: (attachment as any)?.messageId ?? Date.now(),
            message,
            from,
            to,
            createdAt: new Date(),
            updatedAt: new Date(),
            attachment: Array.isArray(attachment)
              ? attachment
              : attachment
                ? [attachment]
                : [],
            requestEstimate: requestEstimate ?? null,
          });
        },
      );
    return () => {
      channel.unbind("message");
    };
  }, [prependToCache, sessionUserId, otherUserId]);

  // Reverse-pagination scroll glue.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);
  const isReady = !isLoading && messages.length > 0;
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
      section="internal"
      user={user}
      setUsersList={setUsersList}
      messages={messages}
      setMessages={setMessages}
      totalMessageBox={totalMessageBoxLength}
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

// Type-only re-export so this module participates in the same paginated
// shape that the action returns.
export type { PaginatedMessagesPage };
