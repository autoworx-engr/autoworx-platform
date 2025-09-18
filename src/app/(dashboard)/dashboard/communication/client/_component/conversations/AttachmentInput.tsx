import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";
import { TiDeleteOutline } from "react-icons/ti";

type TProps = {
  multiAttachmentFile: File[];
  onRemoveAttachment: (attachmentName: string) => void;
  onAllRemove: () => void;
  className?: string;
};

export default function AttachmentInput({
  multiAttachmentFile,
  onRemoveAttachment,
  onAllRemove,
  className,
}: TProps) {
  if (!multiAttachmentFile || multiAttachmentFile.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute bottom-[56px] max-h-48 w-full overflow-y-auto rounded-t-lg border border-gray-200 bg-white shadow-md z-50",
        className
      )}
    >
      {/* Sticky header with remove-all button */}
      <div className="sticky top-0 z-20 flex items-center justify-end bg-white px-3 py-2 shadow-sm">
        <button
          onClick={onAllRemove}
          className="rounded-full bg-red-500/10 p-1.5 text-red-600 hover:bg-red-500/20 transition"
          aria-label="Remove all attachments"
        >
          <TiDeleteOutline size={22} />
        </button>
      </div>

      {/* Attachments grid */}
      <div className="grid grid-cols-2 gap-4 px-5 pb-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {multiAttachmentFile.map((attachmentFile) => (
          <div
            key={attachmentFile.name}
            className="group relative flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm transition hover:shadow-md"
          >
            {/* Individual remove button */}
            <button
              onClick={() => onRemoveAttachment(attachmentFile.name)}
              className="absolute right-1 top-1 hidden rounded-full bg-white p-1 text-gray-700 shadow-sm hover:text-red-500 group-hover:block transition"
              aria-label={`Remove ${attachmentFile.name}`}
            >
              <TiDeleteOutline size={18} />
            </button>

            {attachmentFile.type.includes("image") ? (
              <Image
                src={URL.createObjectURL(attachmentFile)}
                alt={attachmentFile.name}
                className="rounded-md object-cover"
                width={100}
                height={100}
              />
            ) : (
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-md bg-blue-600 text-white">
                <span className="text-xs font-medium text-center">
                  {attachmentFile.name.split(".").pop()?.toUpperCase()}
                </span>
                <span className="text-[10px]">
                  {(attachmentFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}

            <p className="mt-2 line-clamp-2 w-full text-center text-xs text-gray-700">
              {attachmentFile.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
