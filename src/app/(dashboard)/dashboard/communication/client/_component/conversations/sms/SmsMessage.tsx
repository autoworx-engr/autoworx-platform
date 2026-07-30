"use client";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import Image from "next/image";
import SMSAttachment from "./SMSAttachment";

export default function SmsMessage({
  message,
}: {
  message: ClientSMS & {
    user?: {
      firstName: string;
      lastName: string | null;
    } | null;
    attachments: ClientSmsAttachments[];
  };
}) {
  const isIncoming = message.sentBy !== "Company";
  const text = (message.message ?? "").trim();
  const hasAttachments = (message.attachments?.length ?? 0) > 0;

  const senderName =
    message.sentBy === "Company"
      ? message.user &&
        `${message.user.firstName} ${message.user.lastName || ""}`.trim()
      : null;
  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

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
        {/* Bubble — only render when there's text or attachments */}
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative w-fit rounded-2xl px-3 py-2 text-[14px] shadow-sm ring-1 transition",
              "select-text hover:shadow-md",
              !isIncoming && "ml-auto",
              isIncoming
                ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                : "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white ring-white/20",
            )}
          >
            {/* Text */}
            {text && (
              <div className="break-words whitespace-pre-wrap">
                {makeLinksClickable(text)}
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <SMSAttachment
                message={message}
                handleDownload={handleDownload}
              />
            )}
          </div>
        )}

        {/* Timestamp */}
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
              "mt-1  text-[10px] leading-4 text-zinc-500",
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
