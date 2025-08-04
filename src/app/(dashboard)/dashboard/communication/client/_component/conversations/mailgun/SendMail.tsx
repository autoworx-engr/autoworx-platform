"use client";
import { errorToast } from "@/lib/toast";
import Image from "next/image";
import React, { useRef, useState } from "react";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import AttachmentInput from "../AttachmentInput";
import { MdSend } from "react-icons/md";
import { clientListStore } from "@/stores/client-store";

export default function SendMail({
  clientId,
  setConversations,
}: {
  clientId: number;
  setConversations: React.Dispatch<
    React.SetStateAction<
      (MailgunEmail & { attachments: MailgunEmailAttachment[] })[] | undefined
    >
  >;
}) {
  const { clientList, setClientList } = clientListStore();
  const [pending, startTransition] = React.useTransition();
  const [messageInput, setMessageInput] = useState("");

  const [files, setFiles] = useState<File[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (
    e:
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("recipient", clientId.toString());
      formData.append("text", messageInput || "");

      // Append multiple files
      for (const file of files) {
        // `files` is an array of File objects
        formData.append("files", file);
      }

      // Log all data from formData

      const response = await fetch("/api/sendgrid/send", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        errorToast("Failed to send message");
        return;
      }

      // setConversations([
      //   ...conversations,
      //   {
      //     ...result.data,
      //   },
      // ]);
      setConversations((prev) => {
        if (!prev) return [result.data];
        return [...prev, result.data];
      });
      setMessageInput("");
      setFiles([]);
      const currentClient = clientList?.find(
        (client) => client.id === clientId,
      );
      const filterCurrentClient = clientList?.filter(
        (client) => client.id !== clientId,
      );
      currentClient && setClientList([currentClient, ...filterCurrentClient]);
    } catch (e) {
      errorToast("Failed to send message");
    }
  };

  const handleRemoveAttachment = (fileName: string) => {
    setFiles(
      (multiFiles) =>
        multiFiles && multiFiles?.filter((file) => file?.name !== fileName),
    );
  };
  return (
    <div className="relative">
      <AttachmentInput
        multiAttachmentFile={files}
        onAllRemove={() => setFiles([])}
        onRemoveAttachment={handleRemoveAttachment}
      />
      <form
        className="flex h-[51px] items-center gap-x-2 rounded-b-md bg-[#D9D9D9] px-2 py-1"
        onSubmit={(event) => startTransition(() => handleSendMessage(event))}
      >
        <input
          onChange={(e) => {
            setFiles(Array.from(e?.target?.files || []));
            e.target.value = "";
          }}
          multiple
          type="file"
          className="hidden"
          ref={fileRef}
        />
        <Image
          src="/icons/Attachment.svg"
          alt="attachment"
          width={20}
          height={20}
          className="cursor-pointer"
          onClick={() => {
            fileRef?.current?.click();
          }}
        />
        <div className="flex h-full w-full items-center gap-x-2 rounded-md bg-background">
          <textarea
            placeholder="Send Message..."
            className="h-full w-full rounded-md border-none px-2 py-0 text-[16px] focus:outline-none"
            value={messageInput}
            style={{
              WebkitAppearance: "none",
              maxHeight: "100%",
              WebkitTextSizeAdjust: "100%",
              touchAction: "manipulation",
            }}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevents a new line
                startTransition(() => handleSendMessage(e));
              }
            }}
          />
          <button
            type="submit"
            className="px-2 text-[#006D77] disabled:text-gray-400"
            disabled={pending || (!messageInput && files.length === 0)}
          >
            <MdSend className="text-2xl" />
            {/* <Image src="/icons/Send.svg" alt="send" width={20} height={20} /> */}
          </button>
        </div>
      </form>
    </div>
  );
}
