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

  const images = (message?.attachments || []).filter((att: any) =>
    isImage(att.name),
  );
  const nonImages = (message?.attachments || []).filter(
    (att: any) => !isImage(att.name),
  );

  return (
    <div
      className={`flex w-full flex-col gap-1.5 ${isOutgoing ? "items-end" : "items-start"}`}
    >
      {images.length > 0 && (
        <div
          className="grid w-fit gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 6rem)`,
          }}
        >
          {images.map((attachment: any, index: number) => {
            const currentImageIndex = allImageUrls.indexOf(attachment.url);
            const urlsParam = encodeURIComponent(JSON.stringify(allImageUrls));
            return (
              <Link
                href={`/dashboard/communication/photo?urls=${urlsParam}&index=${currentImageIndex}`}
                className="block cursor-pointer overflow-hidden rounded-lg ring-1 ring-black/10 transition hover:ring-black/20 dark:ring-white/15 dark:hover:ring-white/30"
                key={index}
              >
                <Image
                  src={attachment.url}
                  alt="message attachment"
                  width={96}
                  height={96}
                  className="h-24 w-24 object-cover"
                />
              </Link>
            );
          })}
        </div>
      )}

      {nonImages.map((attachment: any, index: number) => {
        if (attachment.isVoiceNote || isAudio(attachment.name)) {
          return (
            <div key={index} className="w-full">
              <VoiceNotePlayer src={attachment.url} isOutgoing={isOutgoing} />
            </div>
          );
        }
        return (
          <button
            key={index}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10"
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
      })}
    </div>
  );
}
