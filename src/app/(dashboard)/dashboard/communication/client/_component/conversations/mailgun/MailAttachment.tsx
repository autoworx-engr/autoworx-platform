import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import React from "react";
import { isImage } from "../../../_utils";
import Image from "next/image";
import { FaFile } from "react-icons/fa";
import Link from "next/link";

type TProps = {
  message: MailgunEmail & { attachments: MailgunEmailAttachment[] };
  onDownload: (fileUrl: string, fileName: string) => void;
};

export default function MailAttachment({ message, onDownload }: TProps) {
  return (
    <div
      className={`flex w-full flex-wrap items-center ${message.emailBy === "Company" && "justify-end"}`}
    >
      {message?.attachments?.map((attachment: any, index: number) => {
        if (isImage(attachment.name)) {
          return (
            <Link
              href={`/dashboard/communication/photo?url=${attachment.url}`}
              className={`#inline-block mx-1 mt-2 cursor-pointer gap-x-2 rounded-md border border-gray-200 px-2 py-1 ${message.emailBy === "Company" && "#float-right"}`}
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
        } else {
          return (
            <div
              className={`#inline-block mx-1 mt-2 cursor-pointer gap-x-2 rounded-md border border-gray-200 px-2 py-1 ${message.emailBy === "Company" && "#float-right"}`}
              key={index}
              onClick={() => onDownload(attachment.url, attachment.name)}
            >
              <span>
                <FaFile />
              </span>
              <p>
                {attachment.name?.length > 10
                  ? attachment.name.slice(0, 10) + "..."
                  : attachment.name}
              </p>
            </div>
          );
        }
      })}
    </div>
  );
}
