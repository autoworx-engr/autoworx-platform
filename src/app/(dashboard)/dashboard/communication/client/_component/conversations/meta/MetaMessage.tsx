"use client";

import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { ClientMetaAttachments, ClientMetaMessage } from "@prisma/client";
import Image from "next/image";

type TMessage = ClientMetaMessage & {
  user?: { firstName: string; lastName: string | null } | null;
  attachments: ClientMetaAttachments[];
};

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  INSTAGRAM: {
    label: "IG",
    className: "bg-gradient-to-br from-[#833AB4] to-[#E1306C] text-white",
  },
  FACEBOOK: {
    label: "FB",
    className: "bg-[#1877F2] text-white",
  },
};

/**
 * Renders a single Meta message bubble (Instagram DM or Facebook Messenger).
 *
 * - Outgoing (sentBy = "Company") aligns right with the AutoWorx teal gradient
 * - Incoming (sentBy = "Client") aligns left with a zinc background
 * - A small platform badge ("IG" in purple-pink or "FB" in blue) on each bubble
 *   shows which channel the message came through
 * - Attachments render as clickable rows that open in a new tab
 * - URL hyperlinks in message text are made clickable by `makeLinksClickable`
 *
 * @param message - `ClientMetaMessage` joined with `attachments` and sending `user`
 */
export default function MetaMessage({ message }: { message: TMessage }) {
  const isIncoming = message.sentBy !== "Company";
  const text = (message.message ?? "").trim();
  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const badge = PLATFORM_BADGE[message.platform] ?? PLATFORM_BADGE.FACEBOOK;

  const senderName =
    message.sentBy === "Company" && message.user
      ? `${message.user.firstName} ${message.user.lastName || ""}`.trim()
      : null;

  const formatTime = (ts: string | number | Date) => {
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  const handleOpen = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 px-2 py-1",
        isIncoming ? "justify-start" : "justify-end",
      )}
    >
      {/* Avatar (incoming only) */}
      {isIncoming && (
        <Image
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNL_ZnOTpXSvhf1UaK7beHey2BX42U6solRA&s"
          alt="Client avatar"
          width={30}
          height={30}
          className="mt-1 rounded-full ring-1 ring-white/50"
        />
      )}

      <div
        className={cn("max-w-[85%] sm:max-w-[70%]", !isIncoming && "ml-auto")}
      >
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative rounded-2xl px-3 py-2 text-[14px] shadow-sm ring-1 transition",
              "select-text hover:shadow-md",
              isIncoming
                ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                : "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white ring-white/20",
            )}
          >
            {/* Channel badge */}
            <span
              className={cn(
                "absolute -top-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                badge.className,
                isIncoming ? "left-2" : "right-2",
              )}
            >
              {badge.label}
            </span>

            {text && (
              <div className="break-words whitespace-pre-wrap pt-1">
                {makeLinksClickable(text)}
              </div>
            )}

            {hasAttachments && (
              <div className="mt-1.5 flex flex-col gap-1">
                {message.attachments.map((att) => (
                  <button
                    key={att.id}
                    onClick={() => handleOpen(att.url)}
                    className="flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1.5 text-left text-[12px] hover:bg-black/20 transition"
                  >
                    <span className="truncate">
                      {att.name ?? att.type ?? "Attachment"}
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
            !isIncoming && "items-end",
          )}
        >
          {senderName && (
            <div className="text-[9px] italic text-zinc-500">{senderName}</div>
          )}
          <div
            className={cn(
              "mt-1 text-[10px] leading-4 text-zinc-500",
              !isIncoming && "text-right",
            )}
            title={new Date(message.createdAt).toLocaleString()}
          >
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
