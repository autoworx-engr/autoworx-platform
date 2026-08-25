"use client";

import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import { format } from "date-fns";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MailAttachment from "./MailAttachment";

type TProps = {
  messages: (MailgunEmail & {
    attachments: MailgunEmailAttachment[];
    user?: {
      firstName: string;
      lastName: string | null;
    } | null;
  })[];

  newestFirst?: boolean; // optional: set true if your array is newest-first
  clientPhoto?: string | null;
};

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function MailGunConversation({
  messages,
  newestFirst = false,
  clientPhoto,
}: TProps) {
  // Normalize to deterministic chronological order (oldest -> newest).
  // This prevents wrong date orientation when source/query order varies.
  const data = useMemo(() => {
    const normalized = newestFirst ? [...messages].reverse() : [...messages];

    return normalized.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return 0;
      }

      return aTime - bTime;
    });
  }, [messages, newestFirst]);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Show "Newest" when user is scrolled up
  const [showJump, setShowJump] = useState(false);
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setShowJump(!atBottom);
  }, []);

  // Attach scroll listener + snap to bottom on first mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    // initial snap to bottom
    requestAnimationFrame(() =>
      bottomAnchorRef.current?.scrollIntoView({ block: "end" }),
    );
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // Auto-scroll to bottom when new messages arrive if user is near bottom
  const [lastId, setLastId] = useState<string | number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.length === 0) return;
    const latest = data[data.length - 1];
    if (!latest) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (latest.id !== lastId && nearBottom) {
      bottomAnchorRef.current?.scrollIntoView({ block: "end" });
    }
    setLastId(latest.id as any);
  }, [data, lastId]);

  useEffect(() => {
    bottomAnchorRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden px-2 py-2"
      >
        <div className="flex w-full flex-col gap-3">
          {(() => {
            let lastDate: string | null = null;

            return data.map((message, index) => {
              const isIncoming = message.emailBy !== "Company";
              const messageDate = format(new Date(message.createdAt), "PPP");
              const messageTime = format(new Date(message.createdAt), "h:mm a");
              const showDateSeparator = messageDate !== lastDate;
              lastDate = messageDate;

              const prev = data[index - 1];
              const showAvatar =
                isIncoming && (!prev || prev.emailBy === "Company");

              const senderName =
                message.emailBy === "Company"
                  ? message.user &&
                    `${message.user.firstName} ${message.user.lastName || ""}`.trim()
                  : null;
              return (
                <div key={message.id} className="w-full">
                  {/* Date chip */}
                  {showDateSeparator && (
                    <div className="my-1 flex items-center justify-center mb-4">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:ring-white/10">
                        {formatDate(
                          new Date(
                            message?.createdAt ?? new Date(),
                          ).toDateString(),
                        )}
                      </span>
                    </div>
                  )}

                  {/* Row */}
                  <div
                    className={cn(
                      "flex w-full items-start gap-2 px-1",
                      isIncoming ? "justify-start" : "justify-end",
                    )}
                  >
                    {showAvatar ? (
                      <Image
                        src={
                          clientPhoto?.includes("autoworx-production")
                            ? clientPhoto
                            : "/images/default.png"
                        }
                        alt="Client avatar"
                        width={30}
                        height={30}
                        className="mt-1 size-7 rounded-full object-cover ring-1 ring-[#0866FF]/40"
                      />
                    ) : (
                      <span className="w-[28px]" aria-hidden />
                    )}

                    <div
                      className={cn(
                        "min-w-0 max-w-[86%] sm:max-w-[70%]",
                        !isIncoming && "ml-auto",
                      )}
                    >
                      {(message?.text?.trim() ||
                        message?.attachments?.length) && (
                        <div
                          className={cn(
                            "group relative w-fit max-w-full text-[14px] transition select-text",
                            !isIncoming && "ml-auto",
                            message?.text?.trim() &&
                              cn(
                                "rounded-2xl px-3 py-2 shadow-sm ring-1 hover:shadow-md",
                                isIncoming
                                  ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                                  : "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white ring-white/20",
                              ),
                          )}
                        >
                          {/* Text */}
                          {message?.text?.trim() && (
                            <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                              {makeLinksClickable(message.text)}
                            </div>
                          )}

                          {/* Attachments */}
                          <MailAttachment
                            message={message}
                            onDownload={(url) =>
                              window.open(url, "_blank", "noopener,noreferrer")
                            }
                          />
                        </div>
                      )}

                      {/* Sender name (small) and Time */}
                      <div
                        className={cn(
                          "mt-1 flex flex-col gap-0 text-zinc-500",
                          !isIncoming && "items-end",
                        )}
                      >
                        {senderName && (
                          <div className="text-[9px] italic text-zinc-500">
                            {senderName}
                          </div>
                        )}

                        <div
                          className={cn(
                            "text-[10px] leading-4",
                            !isIncoming && "text-right",
                          )}
                          title={new Date(message.createdAt).toLocaleString()}
                        >
                          {messageTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Single bottom anchor (outside the map) */}
        <div ref={bottomAnchorRef} className="h-0 w-full" />
      </div>

      {/* Newest button */}
      {showJump && (
        <button
          onClick={() =>
            bottomAnchorRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            })
          }
          className={cn(
            "absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
            "bg-white/90 text-zinc-700 shadow-md ring-1 ring-zinc-200 backdrop-blur",
            "hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-white/10",
          )}
          aria-label="Jump to newest"
          title="Jump to newest"
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
