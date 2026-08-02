import Avatar from "@/components/Avatar";
import { Message as TMessage } from "./internal/UsersArea";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getUserById } from "@/actions/user/getUserById";
import { User } from "@prisma/client";
import Link from "next/link";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { format } from "date-fns";
import { CloudDownload } from "lucide-react";

type TProps = {
  message: TMessage;
  fromGroup: boolean | undefined;
  groupedWithPrev?: boolean;
  onDownload: (attachment: string) => void;
  setIsImageLoaded: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function Message({
  message,
  fromGroup,
  groupedWithPrev = false,
  onDownload,
  setIsImageLoaded,
}: TProps) {
  const [senderInfo, setSenderInfo] = useState<Partial<User> | null>(
    (message.senderInfo as Partial<User> | null | undefined) ?? null,
  );
  useEffect(() => {
    if (message.senderInfo) {
      setSenderInfo(message.senderInfo as Partial<User>);
      return;
    }

    if (!message.userId || groupedWithPrev || !fromGroup) return;
    getUserById(message?.userId).then((res) => {
      if (res.type === "success") {
        setSenderInfo(res.data);
      }
    });
  }, [message.userId, message.senderInfo, groupedWithPrev, fromGroup]);

  const allImageUrls = message.attachment
    ?.filter((att) => att.fileType.includes("image"))
    .map((att) => att.fileUrl);

  const showAvatarColumn = message.sender === "CLIENT" && fromGroup;
  const senderName = senderInfo
    ? `${senderInfo.firstName ?? ""} ${senderInfo.lastName ?? ""}`.trim()
    : "";

  const showNameInBubble =
    showAvatarColumn && !groupedWithPrev && Boolean(senderName);
  const messageTime = format(
    new Date(message?.createdAt ?? new Date()),
    "h:mm a",
  );
  return (
    <div
      className={cn(
        "flex items-center",
        message.sender === "CLIENT" ? "justify-start" : "justify-end",
        // Tight stacking for grouped messages, normal padding otherwise.
        message.message && (groupedWithPrev ? "px-1 py-0.5" : "p-1"),
      )}
    >
      <div className="flex items-start gap-2 p-1">
        {showAvatarColumn &&
          (groupedWithPrev ? (
            // Spacer so the bubble stays aligned with the avatar column above
            <div className="w-9 shrink-0" aria-hidden />
          ) : (
            <Avatar photo={senderInfo?.image} width={36} height={36} />
          ))}
        <div
          className={cn(
            "flex flex-col space-y-3",
            message.sender === "CLIENT" ? "items-start" : "items-end",
          )}
        >
          {message.attachment &&
            message.attachment.length > 0 &&
            message.attachment.map((attachment, index) => {
              const handleLoad = () => {
                if (message?.attachment?.length! - 1 === index) {
                  setIsImageLoaded(true);
                }
              };

              const currentImageIndex = allImageUrls?.indexOf(
                attachment?.fileUrl,
              );
              return (
                <div
                  key={attachment.fileName}
                  className={cn(
                    "flex items-center justify-center",
                    message.sender === "CLIENT"
                      ? "flex-row"
                      : "flex-row-reverse",
                  )}
                >
                  {attachment.fileType.includes("image") ? (
                    <Link
                      href={`/dashboard/communication/photo?urls=${encodeURIComponent(
                        JSON.stringify(allImageUrls),
                      )}&index=${currentImageIndex}`}
                    >
                      <Image
                        src={attachment.fileUrl}
                        alt=""
                        // placeholder="blur"
                        // blurDataURL=""
                        className="aspect-auto cursor-pointer rounded-sm border"
                        onLoad={handleLoad}
                        width={200}
                        height={200}
                      />
                    </Link>
                  ) : (
                    <div className="min-h-16 space-y-1 rounded-md bg-[#006D77] px-5 py-2 text-white">
                      <p>{attachment.fileName}</p>
                      <p>file size: {attachment.fileSize}</p>
                    </div>
                  )}
                  <button onClick={() => onDownload(attachment?.fileUrl!)}>
                    <CloudDownload
                      size={30}
                      className={cn(
                        "cursor-pointer",
                        message.sender === "CLIENT" ? "ml-6" : "mr-6",
                      )}
                    />
                  </button>
                </div>
              );
            })}

          {message.message && (
            <div
              className={cn(
                "max-w-[280px] rounded-2xl px-3 py-1.5 shadow-sm",
                message.sender === "CLIENT"
                  ? cn(
                      "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                      // Tail corner only on the first bubble of a same-sender run.
                      !groupedWithPrev && "rounded-tl-md",
                    )
                  : cn(
                      "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white",
                      !groupedWithPrev && "rounded-tr-md",
                    ),
              )}
            >
              {showNameInBubble && (
                <p
                  className={cn(
                    "mb-0.5 max-w-[260px] truncate text-xs font-semibold text-[#0a8a95]",
                  )}
                >
                  {senderName}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-snug">
                {message.message}
              </p>
            </div>
          )}

          {message.requestEstimate && (
            <>
              {message.sender === "USER" ? (
                <InvoiceModal
                  invoiceId={message.requestEstimate.invoiceId}
                  buttonChild={
                    <button className="w-96 rounded-md bg-[#006D77] p-1">
                      <div className="flex items-center justify-center gap-x-2 rounded-md border border-white p-5">
                        <Image
                          src="/icons/navbar/Invoices.svg"
                          alt="estimate icon"
                          width={20}
                          height={20}
                        />
                        <p className="font-semibold text-white">
                          Requested an Estimate
                        </p>
                      </div>
                    </button>
                  }
                />
              ) : (
                <Link
                  href={`/dashboard/estimate/edit/${message.requestEstimate.invoiceId}`}
                  className={cn(
                    "w-96 rounded-md bg-[#006D77] p-1",
                    message.sender === "CLIENT" && "bg-[#D9D9D9]",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center gap-x-2 rounded-md border border-white p-5",
                      message.sender === "CLIENT" && "border-[#006D77]",
                    )}
                  >
                    <Image
                      src="/icons/navbar/Invoices.svg"
                      alt="estimate icon"
                      width={20}
                      height={20}
                    />
                    <p
                      className={cn(
                        "font-semibold text-white",
                        message.sender === "CLIENT" && "text-[#006D77]",
                      )}
                    >
                      Requested an Estimate
                    </p>
                  </div>
                </Link>
              )}
            </>
          )}
          <p
            className={cn(
              "mt-1 text-[10px] text-gray-400",
              message.sender === "CLIENT" ? "text-left" : "text-right",
            )}
          >
            {messageTime}
          </p>
        </div>
      </div>
    </div>
  );
}
