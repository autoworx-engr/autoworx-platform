"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SmsMessage from "./SmsMessage";
import useInfinitySmsQueryByClientId from "../../../_hooks/useInfinitySmsQuery";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import JumpToLatestButton from "@/components/JumpToLatestButton";
import { sortMessagesChronologically } from "../../../_utils";

export default function SmsBox({
  clientId,
  clientPhoto,
}: {
  clientId: number;
  clientPhoto?: string | null;
}) {
  // data
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitySmsQueryByClientId(clientId);

  // flatten pages (oldest -> newest assumed in each page)
  const rawMessages = useMemo(
    () => data?.pages?.flatMap((p) => p.data) ?? [],
    [data],
  );

  // UI runs oldest -> newest top-to-bottom. Sort rather than reverse: realtime
  // messages are prepended in arrival order, so a split reply whose segments
  // arrive out of order would otherwise render out of order until a refetch.
  const messages = useMemo(
    () => sortMessagesChronologically(rawMessages),
    [rawMessages],
  );

  // scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // show a "scroll to bottom" button if user scrolls up
  const [showJump, setShowJump] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastSeenId, setLastSeenId] = useState<string | number | null>(null);

  // Track scroll position before loading more messages to maintain position.
  // Must be a ref (not state) — using state caused a premature re-render that
  // fired the restoration effect before new data arrived (scrollDiff = 0),
  // resetting the ref to 0 so restoration never actually happened.
  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);

  // Delay top-loading until initial autoscroll settles
  const [isReady, setIsReady] = useState(false);

  // Restore scroll position synchronously after older messages are prepended.
  // useLayoutEffect runs after the DOM commit but before paint — no visible
  // jump. Keyed only on pages.length so it fires exactly once per new page.
  useLayoutEffect(() => {
    if (prevScrollHeightRef.current <= 0) return;
    const container = containerRef.current;
    if (!container) {
      prevScrollHeightRef.current = 0;
      return;
    }
    const scrollDiff = container.scrollHeight - prevScrollHeightRef.current;
    if (scrollDiff > 0) {
      container.scrollTop = container.scrollTop + scrollDiff;
    }
    prevScrollHeightRef.current = 0;
  }, [data?.pages?.length]);

  // Auto-scroll to bottom when a new message is sent or received
  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;

    // Nothing new, or loading older pages — skip
    if (!lastId || lastId === lastSeenId || isFetchingNextPage) return;

    setLastSeenId(lastId);

    if (shouldAutoScroll) {
      // Wait for the DOM to paint the new message, then scroll
      requestAnimationFrame(() => {
        bottomAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [messages, lastSeenId, shouldAutoScroll, isFetchingNextPage]);

  // Only auto-scroll to bottom for initial load - prevent it during infinite scroll
  useEffect(() => {
    // Only scroll to bottom on very first load when component initializes
    if (messages.length > 0 && !isReady && shouldAutoScroll) {
      const scrollToBottom = () => {
        bottomAnchorRef.current?.scrollIntoView({ block: "end" });
        setTimeout(() => setIsReady(true), 200);
      };
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages.length, isReady, shouldAutoScroll]);

  const maybeLoadOlderMessages = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (
      !isReady ||
      el.scrollTop > 80 ||
      !hasNextPage ||
      isFetchingNextPage ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    isLoadingOlderRef.current = true;
    prevScrollHeightRef.current = el.scrollHeight;
    void fetchNextPage().finally(() => {
      isLoadingOlderRef.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isReady]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    maybeLoadOlderMessages();

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 104;

    setShowJump(!atBottom);
    setShouldAutoScroll(atBottom);
  }, [maybeLoadOlderMessages]);

  // Trigger an initial check when the component becomes ready (e.g. not
  // enough messages to fill the screen). Do NOT include data?.pages?.length
  // here — firing on every page load caused an infinite-fetch loop because
  // scroll restoration hadn't happened yet when this ran.
  useEffect(() => {
    if (isReady) maybeLoadOlderMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Fix: Reset ready state when clientId changes
  useEffect(() => {
    setIsReady(false);
    setLastSeenId(null);
  }, [clientId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // helpers
  const formatDateChip = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // content states
  if (isLoading && !isError && messages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isLoading && isError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-red-500">
        Failed to load messages
      </div>
    );
  }

  if (!isLoading && !isError && messages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500">
        No messages found
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      {/* scrollable area */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto px-2 py-2"
      >
        {/* TOP SENTINEL */}
        <div
          ref={topSentinelRef}
          className="flex justify-center py-2 min-h-[40px]"
          style={{ visibility: isReady ? "visible" : "hidden" }}
        >
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <Spinner />
              <span className="text-[11px] text-zinc-500">
                Loading older messages...
              </span>
            </div>
          ) : hasNextPage ? (
            <span className="text-[11px] text-zinc-500">
              Scroll up to load older messages
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500 font-medium">
              • No older messages •
            </span>
          )}
        </div>

        {/* messages */}
        <div className="flex flex-col gap-2">
          {messages.map((message: any, idx: number) => {
            const created = new Date(message.createdAt);
            const dateStr = created.toDateString();

            // Check previous message to decide whether to show the date chip
            const prevMessage = idx > 0 ? messages[idx - 1] : null;
            const prevDateStr = prevMessage
              ? new Date(prevMessage.createdAt).toDateString()
              : null;
            const showChip = dateStr !== prevDateStr;

            return (
              <div key={message.id ?? idx} className="w-full">
                {showChip && (
                  <div className="sticky top-1 z-[1] my-1 flex justify-center mb-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
                        "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
                        "dark:bg-zinc-800/70 dark:text-zinc-300 dark:ring-white/10",
                      )}
                    >
                      {formatDateChip(created)}
                    </span>
                  </div>
                )}
                <SmsMessage message={message} clientPhoto={clientPhoto} />
              </div>
            );
          })}
        </div>

        {/* bottom anchor for autoscroll */}
        <div ref={bottomAnchorRef} className="h-2 w-full" />
      </div>

      {/* jump-to-bottom button */}
      {showJump && (
        <JumpToLatestButton
          onClick={() => {
            setShouldAutoScroll(true);
            bottomAnchorRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }}
        />
      )}
    </div>
  );
}
