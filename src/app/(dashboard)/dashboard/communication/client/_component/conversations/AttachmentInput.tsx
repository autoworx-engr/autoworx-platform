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
  return (
    <>
      {/* attachments */}
      {multiAttachmentFile && multiAttachmentFile.length > 0 && (
        <div
          className={cn(
            "absolute bottom-[56px] h-32 w-full overflow-y-auto rounded-tl-lg rounded-tr-lg bg-[#D9D9D9]",
            className,
          )}
        >
          <TiDeleteOutline
            onClick={onAllRemove}
            className="absolute right-0 top-0 z-10 cursor-pointer rounded-full text-red-500"
            size={40}
          />
          <div className="mt-3 grid grid-cols-4 items-start space-x-3 overflow-x-auto p-4 px-10">
            {multiAttachmentFile?.map((attachmentFile) => {
              return (
                <div key={attachmentFile.name}>
                  <div key={attachmentFile.name} className="relative w-fit">
                    <TiDeleteOutline
                      onClick={() => onRemoveAttachment(attachmentFile.name)}
                      className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-background"
                      size={20}
                    />
                    {attachmentFile.type.includes("image") ? (
                      <Image
                        src={URL.createObjectURL(attachmentFile)}
                        // placeholder="blur"
                        alt=""
                        className="rounded-sm"
                        width={100}
                        height={100}
                      />
                    ) : (
                      <div className="space-y-1 rounded-md bg-[#006D77] px-5 py-2 text-white">
                        <p>{attachmentFile.name}</p>
                        <p>
                          file size:{" "}
                          {(attachmentFile.size / 1024 / 1024).toPrecision(2)}{" "}
                          MB
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm">{attachmentFile.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
