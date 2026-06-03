import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TBugReportMessage } from "@/types/BugReportMessage";
import { Attachment } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ImageModal from "./ImageModal";

interface MessageCardProps {
  messages: TBugReportMessage;
  isAdminView?: boolean;
  selectedContact: {
    company: {
      name: string;
      image?: string;
    };
  };
}

export const MessageCard = ({
  messages,
  isAdminView = false,
  selectedContact,
}: MessageCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const isCompany = messages.senderType === "company";
  const avatarSrc = isCompany
    ? selectedContact.company.image || "/placeholder.svg"
    : "";
  const displayName = isCompany ? selectedContact.company.name : "AX";

  const formattedDate = new Date(messages.createdAt).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
  });

  const isSender = isAdminView ? isCompany : !isCompany;

  return (
    <>
      <div
        className={`flex items-start ${
          isSender ? "flex-row space-x-2" : "flex-row-reverse gap-2"
        }`}
      >
        <Avatar className="mt-1 h-8 w-8">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          {/* Attachment Section */}
          {messages?.attachment?.length > 0 && (
            <div
              className={`mb-2 flex flex-wrap gap-2 ${
                isSender ? "justify-start" : "justify-end"
              }`}
            >
              {messages.attachment.map(
                (attachment: Attachment, index: number) => {
                  // const handleLoad = () => {
                  //   if (messages?.attachment?.length! - 1 === index) {
                  //     setIsImageLoaded(true);
                  //   }
                  // };
                  return (
                    <div
                      key={attachment.id}
                      // className="relative h-[120px] w-[180px] overflow-hidden rounded-lg border border-gray-300"
                    >
                      {attachment.fileType.includes("image") ? (
                        <Image
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="aspect-auto cursor-pointer rounded-sm border"
                          width={200}
                          height={200}
                          onClick={() => {
                            setCurrentImageIndex(index);
                            setIsModalOpen(true);
                            // setIsImageLoading(true);
                          }}
                        />
                      ) : (
                        <div className="min-h-16 space-y-1 rounded-md bg-[#006D77] px-5 py-2 text-white">
                          <p>{attachment.fileName}</p>
                          <p>file size: {attachment.fileSize}</p>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* Message Bubble */}
          {messages.content && (
            <div
              className={`group relative max-w-full rounded-xl p-3 text-sm shadow-md ${
                isSender
                  ? "me-[20%] bg-white text-gray-800"
                  : "ms-[20%] bg-[#006D77] text-white"
              }`}
            >
              <p className="whitespace-pre-line break-words">
                {messages.content}
              </p>
            </div>
          )}

          {/* Time + Read Status */}
          <div
            className={`mt-1 flex items-center ${
              isSender ? "justify-start" : "justify-end"
            } text-xs opacity-70`}
          >
            <span>{formattedDate}</span>
            {/* Show read status only for messages sent by current viewer */}
            {((isAdminView && !isCompany) || (!isAdminView && isCompany)) && (
              <span
                className={`ml-2 ${messages.isRead ? "text-blue-500" : ""}`}
              >
                {messages.isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ImageModal
          currentImageIndex={currentImageIndex}
          message={messages}
          isOptimistic={false}
          setCurrentImageIndex={setCurrentImageIndex}
          setIsModalOpen={setIsModalOpen}
          isImageLoading={isImageLoading}
          isModalOpen={isModalOpen}
          setIsImageLoading={setIsImageLoading}
        />
      )}
    </>
  );
};
