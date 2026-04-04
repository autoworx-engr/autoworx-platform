"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SmsMessage from "./SmsMessage";
import useInfinitySmsQueryByClientId from "../../../_hooks/useInfinitySmsQuery";
import Spinner from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

export default function SmsBox({ clientId }: { clientId: number }) {
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

  // we want UI in chronological order top->bottom but newest at the bottom:
  const messages = [...rawMessages].reverse();

  // scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // show a "scroll to bottom" button if user scrolls up
  const [showJump, setShowJump] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastSeenId, setLastSeenId] = useState<string | number | null>(null);

  // Track scroll position before loading more messages to maintain position
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const isLoadingOlderRef = useRef(false);

  // Delay top-loading until initial autoscroll settles
  const [isReady, setIsReady] = useState(false);

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (prevScrollHeight > 0 && containerRef.current) {
      const container = containerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeight;

      if (scrollDiff > 0) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          container.scrollTop = container.scrollTop + scrollDiff;
        }, 0);
      }

      setPrevScrollHeight(0);
    }
  }, [data?.pages?.length, prevScrollHeight]); // Track pages length instead of messages length

  // Only auto-scroll to bottom for initial load or new incoming messages (not infinite scroll)
  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;

    // Only scroll to bottom if this is a new message (different from what we've seen)
    // and we're not in the middle of loading older messages
    if (
      !lastSeenId ||
      (lastId && lastId !== lastSeenId && !isFetchingNextPage)
    ) {
      const el = containerRef.current;
      if (el && shouldAutoScroll) {
        const nearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) {
          setTimeout(() => {
            bottomAnchorRef.current?.scrollIntoView({ block: "end" });
          }, 0);
        }
      }
      setLastSeenId(lastId);
    }
  }, [messages, lastSeenId, shouldAutoScroll, isFetchingNextPage]); // Added isFetchingNextPage

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
    setPrevScrollHeight(el.scrollHeight);
    void fetchNextPage().finally(() => {
      isLoadingOlderRef.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isReady]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    maybeLoadOlderMessages();

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;

    setShowJump(!atBottom);
    setShouldAutoScroll(atBottom);
  }, [maybeLoadOlderMessages]);

  useEffect(() => {
    maybeLoadOlderMessages();
  }, [isReady, data?.pages?.length, maybeLoadOlderMessages]);

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
        className="thin-scrollbar h-full w-full overflow-y-auto px-2 py-2"
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
                <SmsMessage message={message} />
              </div>
            );
          })}
        </div>

        {/* bottom anchor for autoscroll */}
        <div ref={bottomAnchorRef} className="h-2 w-full" />
      </div>

      {/* jump-to-bottom button */}
      {showJump && (
        <button
          onClick={() => {
            setShouldAutoScroll(true);
            bottomAnchorRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }}
          className={cn(
            "absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
            "bg-white/90 text-zinc-700 shadow-md ring-1 ring-zinc-200 backdrop-blur",
            "hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-white/10",
            "transition-all duration-200 hover:scale-105",
          )}
          aria-label="Jump to latest"
          title="Jump to latest"
        >
          Newest
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <path d="M10 15a1 1 0 0 1-.7-.29l-5-5a1 1 0 1 1 1.4-1.42L10 12.59l4.3-4.3a1 1 0 0 1 1.4 1.42l-5 5A1 1 0 0 1 10 15Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
