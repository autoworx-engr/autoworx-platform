"use client";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { File } from "lucide-react";
import Image from "next/image";

type TAttachment = {
  id: number;
  url: string;
  name: string | null;
  attachmentType: string;
};

type TMessage = {
  id: number | string;
  message: string | null;
  sentBy: string;
  createdAt: string | Date;
  isSending?: boolean;
  attachments: TAttachment[];
  user?: { firstName: string; lastName: string | null } | null;
};

export default function InstagramMessage({ message }: { message: TMessage }) {
  const isIncoming = message.sentBy !== "Company";
  const isOutgoing = !isIncoming;
  const text = (message.message ?? "").trim();
  const hasAttachments = message.attachments?.length > 0;

  const senderName =
    isOutgoing && message.user
      ? `${message.user.firstName} ${message.user.lastName ?? ""}`.trim()
      : null;

  const formatTime = (ts: string | Date) => {
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 px-2 py-1",
        isIncoming ? "justify-start" : "justify-end",
      )}
    >
      {isIncoming && (
        <Image
          src="/images/default.png"
          alt="Instagram user"
          width={30}
          height={30}
          className="mt-1 size-7 rounded-full object-cover ring-1 ring-[#0866FF]/40"
        />
      )}

      <div
        className={cn(
          "min-w-0 max-w-[85%] sm:max-w-[70%]",
          isOutgoing && "ml-auto",
        )}
      >
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative rounded-2xl px-3 py-2 text-[14px] shadow-sm ring-1 transition select-text hover:shadow-md",
              isIncoming
                ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                : "bg-gradient-to-br from-[#E1306C] to-[#833AB4] text-white ring-white/20",
            )}
          >
            {text && (
              <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {makeLinksClickable(text)}
              </div>
            )}
            {hasAttachments && (
              <div
                className={cn(
                  "flex flex-col gap-1",
                  isOutgoing ? "items-end" : "items-start",
                )}
              >
                {message.attachments.map((att, i) => (
                  <button
                    key={att.id ?? i}
                    className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-white/30 px-2 py-1"
                    onClick={() =>
                      window.open(att.url, "_blank", "noopener,noreferrer")
                    }
                  >
                    <File className="h-4 w-4 shrink-0" />
                    <span className="text-sm">
                      {att.name ?? att.attachmentType}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "mt-1 flex flex-col gap-0 text-zinc-500",
            isOutgoing && "items-end",
          )}
        >
          {senderName && (
            <div className="text-[9px] italic text-zinc-500">{senderName}</div>
          )}
          <div
            className={cn(
              "mt-1 text-[10px] leading-4 text-zinc-500",
              isOutgoing && "text-right",
            )}
          >
            {message.isSending ? (
              <span className="italic opacity-60">Sending…</span>
            ) : (
              formatTime(message.createdAt)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
