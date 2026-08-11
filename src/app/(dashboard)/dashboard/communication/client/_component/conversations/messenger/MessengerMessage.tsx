"use client";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { File } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import VoiceNotePlayer from "../sms/VoiceNotePlayer";

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

function MessengerAttachments({
  attachments,
  isOutgoing,
}: {
  attachments: TAttachment[];
  isOutgoing: boolean;
}) {
  const allImageUrls = attachments
    .filter((a) => a.attachmentType === "image" && a.url)
    .map((a) => a.url);

  return (
    <div
      className={cn(
        "flex w-full flex-wrap gap-1.5",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      {attachments.map((att, index) => {
        if (att.attachmentType === "image") {
          const currentIndex = allImageUrls.indexOf(att.url);
          const urlsParam = encodeURIComponent(JSON.stringify(allImageUrls));
          return (
            <Link
              key={att.id ?? index}
              href={`/dashboard/communication/photo?urls=${urlsParam}&index=${currentIndex}`}
              className="block cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/10 transition hover:ring-black/20 dark:ring-white/15 dark:hover:ring-white/30"
            >
              <Image
                src={att.url}
                alt="attachment"
                width={96}
                height={96}
                className="h-24 w-24 object-cover"
              />
            </Link>
          );
        }

        if (att.attachmentType === "audio") {
          return (
            <div key={att.id ?? index} className="w-full">
              <VoiceNotePlayer src={att.url} isOutgoing={isOutgoing} />
            </div>
          );
        }

        if (att.attachmentType === "video") {
          return (
            <a
              key={att.id ?? index}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10"
            >
              <File className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{att.name ?? "video"}</span>
            </a>
          );
        }

        // Generic file download
        const displayName = att.name
          ? att.name.length > 10
            ? att.name.slice(0, 10) + "…"
            : att.name
          : att.attachmentType;
        return (
          <button
            key={att.id ?? index}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10"
            onClick={() =>
              window.open(att.url, "_blank", "noopener,noreferrer")
            }
          >
            <File className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{displayName}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function MessengerMessage({ message }: { message: TMessage }) {
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
          alt="Messenger user"
          width={30}
          height={30}
          className="mt-1 rounded-full ring-1 ring-[#0866FF]/40"
        />
      )}

      <div
        className={cn("max-w-[85%] sm:max-w-[70%]", isOutgoing && "ml-auto")}
      >
        {/* Attachment-only messages skip the colored bubble entirely so the
            images float on their own instead of sitting inside a solid background. */}
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative text-[14px] transition select-text",
              text &&
                cn(
                  "rounded-2xl px-3 py-2 shadow-sm ring-1 hover:shadow-md",
                  isIncoming
                    ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                    : "bg-gradient-to-br from-[#0866FF] to-[#0057d9] text-white ring-white/20",
                ),
            )}
          >
            {text && (
              <div className="break-words whitespace-pre-wrap">
                {makeLinksClickable(text)}
              </div>
            )}

            {hasAttachments && (
              <MessengerAttachments
                attachments={message.attachments}
                isOutgoing={isOutgoing}
              />
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
