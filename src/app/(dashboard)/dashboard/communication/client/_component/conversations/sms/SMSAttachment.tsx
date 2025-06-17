import { ClientSMS, ClientSmsAttachments } from "@prisma/client";
import React from "react";
import { isImage } from "../../../_utils";
import Image from "next/image";
import { FaFile } from "react-icons/fa";
import Link from "next/link";

type TProps = {
  message: ClientSMS & {
    attachments: ClientSmsAttachments[];
  };
  handleDownload: (fileUrl: string, fileName: string) => void;
};

export default function SMSAttachment({ message, handleDownload }: TProps) {
  return (
    <div
      className={`flex w-full flex-wrap items-center ${message.sentBy === "Company" && "justify-end"}`}
    >
      {message?.attachments?.map((attachment: any, index: number) => {
        if (isImage(attachment.name)) {
          return (
            <Link
              href={`/dashboard/communication/photo?url=${attachment.url}`}
              className={`#inline-block mx-1 mt-2 cursor-pointer gap-x-2 rounded-md border border-gray-200 px-2 py-1 ${message.sentBy === "Company" && "#float-right"}`}
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
              className={`#inline-block mx-1 mt-2 cursor-pointer gap-x-2 rounded-md border border-gray-200 px-2 py-1 ${message.sentBy === "Company" && "#float-right"}`}
              key={index}
              onClick={() => handleDownload(attachment.url, attachment.name)}
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
