"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import InstagramMessage from "./InstagramMessage";
import useInfinityInstagramQuery from "../../../_hooks/useInfinityInstagramQuery";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

export default function InstagramBox({ clientId }: { clientId: number }) {
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityInstagramQuery(clientId);

  const rawMessages = useMemo(
    () => data?.pages?.flatMap((p) => p.data) ?? [],
    [data],
  );
  const messages = [...rawMessages].reverse();

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);

  const [showJump, setShowJump] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastSeenId, setLastSeenId] = useState<string | number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    if (prevScrollHeightRef.current <= 0) return;
    const el = containerRef.current;
    if (!el) {
      prevScrollHeightRef.current = 0;
      return;
    }
    const diff = el.scrollHeight - prevScrollHeightRef.current;
    if (diff > 0) el.scrollTop += diff;
    prevScrollHeightRef.current = 0;
  }, [data?.pages?.length]);

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

  const maybeLoadOlder = useCallback(() => {
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
    prevScrollHeightRef.current = el.scrollHeight;
    void fetchNextPage().finally(() => {
      isLoadingOlderRef.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isReady]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    maybeLoadOlder();
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setShowJump(!atBottom);
    setShouldAutoScroll(atBottom);
  }, [maybeLoadOlder]);

  useEffect(() => {
    if (isReady) maybeLoadOlder();
  }, [isReady]);
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

  if (isLoading && messages.length === 0)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (isError)
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Failed to load messages
      </div>
    );
  if (!isLoading && messages.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        No Instagram messages yet
      </div>
    );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto px-2 py-2"
      >
        <div
          className="flex justify-center py-2 min-h-[40px]"
          style={{ visibility: isReady ? "visible" : "hidden" }}
        >
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <Spinner />
              <span className="text-[11px] text-zinc-500">Loading older…</span>
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
        <div className="flex flex-col gap-2">
          {messages.map((msg: any, idx: number) => (
            <div key={msg.id ?? idx} className="w-full">
              <InstagramMessage message={msg} />
            </div>
          ))}
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
            "hover:bg-white transition-all duration-200 hover:scale-105",
          )}
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
