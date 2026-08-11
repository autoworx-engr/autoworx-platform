import { cn } from "@/lib/cn";
import { File } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Attachment = {
  name: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

type TProps = {
  message: { emailBy: string; attachments?: Attachment[] };
  onDownload?: (fileUrl: string, fileName: string) => void;
};

const isImage = (nameOrMime?: string) =>
  !!nameOrMime &&
  (/\.(png|jpe?g|gif|webp|bmp|tiff|svg)$/i.test(nameOrMime) ||
    /^image\//i.test(nameOrMime));

export default function MailAttachment({ message, onDownload }: TProps) {
  const attachments = message?.attachments ?? [];
  if (!attachments.length) return null;

  const allImageUrls = attachments
    .filter((a) => isImage(a.mimeType ?? a.name) && typeof a.url === "string")
    .map((a) => a.url as string);

  return (
    <div
      className={cn(
        "mt-2 flex w-full flex-wrap items-start gap-2",
        message.emailBy === "Company" && "justify-end",
      )}
    >
      {attachments.map((att, i) => {
        const img = isImage(att.mimeType ?? att.name);

        // IMAGE THUMB
        if (img) {
          const currentImageIndex = allImageUrls.indexOf(att.url);
          const urlsParam = encodeURIComponent(JSON.stringify(allImageUrls));
          return (
            <Link
              key={`${att.url}-${i}`}
              href={`/dashboard/communication/photo?urls=${urlsParam}&index=${currentImageIndex}`}
              className={cn(
                "group relative inline-flex overflow-hidden rounded-md ring-1 ring-zinc-200 transition",
                "hover:ring-emerald-400 dark:ring-white/10",
              )}
              title={att.name}
            >
              <Image
                src={att.url}
                alt={att.name || "image attachment"}
                width={96}
                height={96}
                className="h-24 w-24 object-cover"
              />
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-black/10" />
            </Link>
          );
        }

        // FILE CHIP
        return (
          <Link
            key={`${att.url}-${i}`}
            href={`${att.url}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              "ring-1 ring-zinc-200 bg-white hover:ring-emerald-400 transition",
              "dark:bg-zinc-900 dark:ring-white/10",
            )}
            title={att.name}
          >
            <File className="w-5 h-5 text-zinc-500 dark:text-zinc-300" />
            <span className="max-w-[12rem] truncate text-zinc-700 dark:text-zinc-200">
              {att.name || "file"}
            </span>
            {onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDownload(att.url, att.name);
                }}
                className="ml-1 rounded-sm px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
              >
                Download
              </button>
            )}
          </Link>
        );
      })}
    </div>
  );
}
