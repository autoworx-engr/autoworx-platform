"use client";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import { Check, CheckCheck, MessageSquare } from "lucide-react";
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
      {isIncoming && (
        <Image
          src="/images/default.png"
          alt="Client avatar"
          width={30}
          height={30}
          className="mt-1 size-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-white/10"
        />
      )}

      <div
        className={cn("max-w-[85%] sm:max-w-[70%]", !isIncoming && "ml-auto")}
      >
        {/* Bubble — only render when there's text or attachments */}
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative px-3.5 py-2 text-[14px] shadow-sm transition",
              "select-text hover:shadow-md",
              isIncoming
                ? "rounded-2xl rounded-tl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "rounded-2xl rounded-tr-md bg-[#006D77] text-white",
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
              "mt-1 inline-flex items-center gap-1 text-[10px] leading-4 text-zinc-500",
              !isIncoming && "justify-end",
            )}
            title={new Date(message.createdAt).toLocaleString()}
          >
            <MessageSquare className="h-3 w-3" />
            <span>{formatTime(message.createdAt)}</span>
            {!isIncoming &&
              (message.isRead ? (
                <CheckCheck className="h-3 w-3 text-[#006D77]" />
              ) : (
                <Check className="h-3 w-3" />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
