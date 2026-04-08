import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import React from "react";
import { isAudio, isImage } from "../../../_utils";
import Image from "next/image";
import Link from "next/link";
import { File } from "lucide-react";
import VoiceNotePlayer from "./VoiceNotePlayer";

type TProps = {
  message: ClientSMS & {
    attachments: (ClientSmsAttachments & { isVoiceNote?: boolean })[];
  };
  handleDownload: (fileUrl: string, fileName: string) => void;
};

export default function SMSAttachment({ message, handleDownload }: TProps) {
  const isOutgoing = message.sentBy === "Company";

  const allImageUrls = (message?.attachments || [])
    .filter((att: any) => isImage(att.name) && typeof att.url === "string")
    .map((att: any) => att.url as string);

  return (
    <div
      className={`flex w-full flex-col gap-1 ${isOutgoing ? "items-end" : "items-start"}`}
    >
      {message?.attachments?.map((attachment: any, index: number) => {
        if (isImage(attachment.name)) {
          const currentImageIndex = allImageUrls.indexOf(attachment.url);
          const urlsParam = encodeURIComponent(JSON.stringify(allImageUrls));
          return (
            <Link
              href={`/dashboard/communication/photo?urls=${urlsParam}&index=${currentImageIndex}`}
              className="mx-1 mt-1 cursor-pointer rounded-md border border-gray-200 px-2 py-1"
              key={index}
            >
              <Image
                src={attachment.url}
                alt="message"
                width={70}
                height={100}
              />
            </Link>
          );
        } else if (attachment.isVoiceNote || isAudio(attachment.name)) {
          return (
            <div key={index} className="mt-1">
              <VoiceNotePlayer src={attachment.url} isOutgoing={isOutgoing} />
            </div>
          );
        } else {
          return (
            <button
              key={index}
              className="mx-1 mt-1 flex items-center gap-2 cursor-pointer rounded-md border border-gray-200 px-2 py-1"
              onClick={() => handleDownload(attachment?.url, attachment?.name)}
            >
              <File className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                {attachment.name?.length > 10
                  ? attachment.name.slice(0, 10) + "..."
                  : attachment.name}
              </p>
            </button>
          );
        }
      })}
    </div>
  );
}
