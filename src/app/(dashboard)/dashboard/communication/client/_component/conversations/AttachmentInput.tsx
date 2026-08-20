import { isAudio } from "../../_utils";
import { cn } from "@/lib/cn";
import { CircleX, Mic } from "lucide-react";
import Image from "next/image";
import React from "react";

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
        "absolute bottom-[56px] w-full rounded-t-lg border border-gray-200 bg-white shadow-md z-50",
        className,
      )}
    >
      {/* Sticky header with remove-all button */}
      <div className="sticky top-0 z-20 flex items-center justify-end bg-white px-3 py-2 shadow-sm border-b border-gray-100">
        <button
          onClick={onAllRemove}
          className="rounded-full bg-red-500/10 p-1.5 text-red-600 hover:bg-red-500/20 transition-colors"
          aria-label="Remove all attachments"
        >
          <CircleX size={20} />
        </button>
      </div>

      {/* Scrollable attachments container */}
      <div className="max-h-64 overflow-y-auto px-4 pb-4">
        {/* Responsive grid for attachments with minimum item width */}
        <div
          className="grid gap-3 pt-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          }}
        >
          {multiAttachmentFile.map((attachmentFile) => (
            <div
              key={attachmentFile.name}
              className="group relative flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md hover:border-gray-300 min-w-0"
            >
              {/* Individual remove button */}
              <button
                onClick={() => onRemoveAttachment(attachmentFile.name)}
                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 rounded-full bg-white p-1 text-gray-700 shadow-md hover:text-red-500 hover:shadow-lg transition-all z-10 border border-gray-200"
                aria-label={`Remove ${attachmentFile.name}`}
              >
                <CircleX size={14} />
              </button>

              {/* File preview container */}
              <div className="relative mb-2">
                {attachmentFile.type.includes("image") ? (
                  // Image preview with consistent sizing
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-300">
                    <Image
                      src={URL.createObjectURL(attachmentFile)}
                      alt={attachmentFile.name}
                      className="object-cover"
                      fill
                      sizes="80px"
                    />
                  </div>
                ) : isAudio(attachmentFile.name) ||
                  attachmentFile.type.startsWith("audio/") ? (
                  // Audio / voice note preview
                  <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white shadow-sm">
                    <Mic size={28} className="opacity-90" />
                    <p className="text-[10px] mt-1 opacity-90">
                      {(attachmentFile.size / 1024).toFixed(0)}KB
                    </p>
                  </div>
                ) : (
                  // Non-image file preview with consistent sizing
                  <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                    <p className="text-xs font-semibold text-center px-1 leading-tight">
                      {attachmentFile.name.split(".").pop()?.toUpperCase() ||
                        "FILE"}
                    </p>
                    <p className="text-[10px] mt-0.5 opacity-90">
                      {(attachmentFile.size / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                )}
              </div>

              {/* File name with proper truncation */}
              <p className="w-full text-center text-xs text-gray-700 leading-tight break-all line-clamp-2 px-1 mt-1">
                {attachmentFile.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
