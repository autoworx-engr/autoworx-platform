"use client";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { cn } from "@/lib/cn";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import Image from "next/image";
import MissedCallDivider from "./MissedCallDivider";
import SMSAttachment from "./SMSAttachment";

export default function SmsMessage({
  message,
  clientPhoto,
}: {
  clientPhoto?: string | null;
  message: ClientSMS & {
    user?: {
      firstName: string;
      lastName: string | null;
    } | null;
    attachments: ClientSmsAttachments[];
    messageType?: string | null;
  };
}) {
  if (message.messageType === "MISSED_CALL") {
    return <MissedCallDivider at={message.createdAt} />;
  }

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
          src={
            clientPhoto?.includes("autoworx-production")
              ? clientPhoto
              : "/images/default.png"
          }
          alt="Messenger user"
          width={30}
          height={30}
          className="mt-1 rounded-full ring-1 ring-[#0866FF]/40"
        />
      )}

      <div
        className={cn(
          "min-w-0 max-w-[85%] sm:max-w-[70%]",
          !isIncoming && "ml-auto",
        )}
      >
        {(!!text || hasAttachments) && (
          <div
            className={cn(
              "group relative w-fit max-w-full text-[14px] transition select-text",
              !isIncoming && "ml-auto",
              text &&
                cn(
                  "rounded-2xl px-3 py-2 shadow-sm ring-1 hover:shadow-md",
                  isIncoming
                    ? "bg-zinc-200 text-zinc-900 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                    : "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white ring-white/20",
                ),
            )}
          >
            {text && (
              <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">
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
