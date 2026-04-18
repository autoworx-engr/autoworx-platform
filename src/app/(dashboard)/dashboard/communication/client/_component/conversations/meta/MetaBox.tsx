"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useInfinityMetaQueryByClientId from "../../../_hooks/useInfinityMetaQuery";
import MetaMessage from "./MetaMessage";

export default function MetaBox({ clientId }: { clientId: number }) {
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityMetaQueryByClientId(clientId);

  const rawMessages = useMemo(
    () => data?.pages?.flatMap((p) => p.data) ?? [],
    [data],
  );
  const messages = [...rawMessages].reverse();

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastSeenId, setLastSeenId] = useState<string | number | null>(null);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const isLoadingOlderRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (prevScrollHeight > 0 && containerRef.current) {
      const el = containerRef.current;
      const diff = el.scrollHeight - prevScrollHeight;
      if (diff > 0)
        setTimeout(() => {
          el.scrollTop += diff;
        }, 0);
      setPrevScrollHeight(0);
    }
  }, [data?.pages?.length, prevScrollHeight]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    if (!lastId || lastId === lastSeenId || isFetchingNextPage) return;
    setLastSeenId(lastId);
    if (shouldAutoScroll) {
      requestAnimationFrame(() =>
        bottomAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        }),
      );
    }
  }, [messages, lastSeenId, shouldAutoScroll, isFetchingNextPage]);

  useEffect(() => {
    if (messages.length > 0 && !isReady && shouldAutoScroll) {
      requestAnimationFrame(() => {
        bottomAnchorRef.current?.scrollIntoView({ block: "end" });
        setTimeout(() => setIsReady(true), 200);
      });
    }
  }, [messages.length, isReady, shouldAutoScroll]);

  const maybeLoadOlderMessages = useCallback(() => {
    const el = containerRef.current;
    if (
      !el ||
      !isReady ||
      el.scrollTop > 80 ||
      !hasNextPage ||
      isFetchingNextPage ||
      isLoadingOlderRef.current
    )
      return;
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

  const formatDateChip = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (isLoading && messages.length === 0) {
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
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="thin-scrollbar h-full w-full overflow-y-auto px-2 py-2"
      >
        <div
          className="flex justify-center py-2 min-h-[40px]"
          style={{ visibility: isReady ? "visible" : "hidden" }}
        >
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <Spinner />
              <span className="text-[11px] text-zinc-500">
                Loading older messages…
              </span>
            </div>
          ) : hasNextPage ? (
            <span className="text-[11px] text-zinc-500">
              Scroll up to load older messages
            </span>
          ) : (
            <span className="text-[11px] font-medium text-zinc-500">
              • No older messages •
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {messages.map((message: any, idx: number) => {
            const created = new Date(message.createdAt);
            const dateStr = created.toDateString();
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showChip =
              dateStr !==
              (prev ? new Date(prev.createdAt).toDateString() : null);
            return (
              <div key={message.id ?? idx} className="w-full">
                {showChip && (
                  <div className="sticky top-1 z-[1] my-1 flex justify-center mb-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
                        "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-300 dark:ring-white/10",
                      )}
                    >
                      {formatDateChip(created)}
                    </span>
                  </div>
                )}
                <MetaMessage message={message} />
              </div>
            );
          })}
        </div>
        <div ref={bottomAnchorRef} className="h-2 w-full" />
      </div>

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
            "hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-white/10 transition-all duration-200 hover:scale-105",
          )}
          aria-label="Jump to latest"
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
