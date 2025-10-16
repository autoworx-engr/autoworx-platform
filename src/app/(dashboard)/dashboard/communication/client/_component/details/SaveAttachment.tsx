"use client";
import Link from "next/link";
import { MailgunEmailAttachment, ClientSmsAttachments } from "@prisma/client";
import { File } from "lucide-react";

type TProps = {
  attachment: MailgunEmailAttachment | ClientSmsAttachments;
};

export default function SaveAttachment({ attachment }: TProps) {
  const handleDownload = (fileUrl: string, fileName: string) => {
    window.open(fileUrl, "_blank", "noopener,noreferrer"); // Open the file URL in a new tab
  };

  return (
    <Link href={`/dashboard/communication/photo?url=${attachment.url}`}>
      <div
        className="flex cursor-pointer gap-x-2 rounded-md border border-emerald-600 px-2 py-1 text-sm"
        // onClick={() => handleDownload(attachment.url, attachment.name)}
      >
        <span>
          <File className="w-5 h-5" />
        </span>

        <p>
          {attachment.name?.length > 15
            ? attachment.name.slice(0, 15) + "..."
            : attachment.name}
        </p>
      </div>
    </Link>
  );
}
