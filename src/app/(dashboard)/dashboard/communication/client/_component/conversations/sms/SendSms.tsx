"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { errorToast } from "@/lib/toast";
import { clientListStore } from "@/stores/client-store";
import Image from "next/image";
import React, { useRef, useState } from "react";
import useSmsSendMutation from "../../../_hooks/useSmsSendMutation";
import AttachmentInput from "../AttachmentInput";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useServerGet } from "@/hooks/useServerGet";
import { getCompany } from "@/actions/settings/getCompany";
import { SendHorizontal } from "lucide-react";
import SmartReplyBar from "./SmartReply";

// Helper function to format attachment message
const formatAttachmentMessage = (files: File[]) => {
  if (files.length === 0) return "";

  const images = files.filter((file) => file.type.startsWith("image/"));
  const otherFiles = files.filter((file) => !file.type.startsWith("image/"));

  const parts = [];
  if (images.length > 0) {
    parts.push(images.length === 1 ? "1 image" : `${images.length} images`);
  }
  if (otherFiles.length > 0) {
    parts.push(
      otherFiles.length === 1 ? "1 file" : `${otherFiles.length} files`
    );
  }

  return parts.join(", ");
};

type TProps = {
  clientId: number;
  companyId: number;
};

export default function SendSms({ clientId, companyId }: TProps) {
  const { clientList, setClientList } = clientListStore();
  const { mutate, isSuccess, isPending } = useSmsSendMutation(clientId);
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();

  const { data } = useServerGet(getCompany);

  const [files, setFiles] = useState<File[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>
  ) => {
    e.preventDefault();

    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage && files.length === 0) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      clientId,
      message: trimmedMessage,
      files,
      createdAt: new Date().toISOString(),
      isSending: true,
      sentBy: "Company",
      smsGateway: data?.smsGateway || "TWILIO",
    };

    // Update conversation track optimistically
    const lastMessage =
      files.length > 0 ? formatAttachmentMessage(files) : trimmedMessage;

    if (clientConversationTrack) {
      setClientConversationTrack({
        ...clientConversationTrack,
        smsLastMessage: lastMessage,
        lastMessageBy: "Company",
        smsIsRead: true,
        sendAt: new Date(),
      });
    }

    setMessageInput("");
    setFiles([]);

    try {
      mutate(optimisticMessage);

      if (isSuccess) {
        await updateFirstContactTimeClient(clientId);

        // Push this client to the top
        const currentClient = clientList?.find((c) => c.id === clientId);
        const filtered = clientList?.filter((c) => c.id !== clientId);
        if (currentClient) {
          setClientList([currentClient, ...filtered]);
        }
      }
    } catch (err) {
      console.error("🚨 Send SMS Error:", err);
      errorToast("Error sending message");
    }
  };

  return (
    <>
      <AttachmentInput
        className="bottom-[50px]"
        multiAttachmentFile={files}
        onAllRemove={() => setFiles([])}
        onRemoveAttachment={(attachmentName) =>
          setFiles((prev) => prev.filter((f) => f.name !== attachmentName))
        }
      />

      {/* 👇 AI Smart Replies */}
      <div className="bg-[#F3F4F6] px-2 pt-2">
        <SmartReplyBar
          clientId={clientId}
          companyId={companyId}
          draft={messageInput} // <-- pass the textarea value here
          onPick={(text) => setMessageInput(text)} // or append if you prefer
        />
      </div>

      <form
        className="flex items-center gap-2 rounded-b-md bg-zinc-100 px-2 pb-1 pt-2 dark:bg-zinc-800/60"
        onSubmit={handleSendMessage}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files || []);
          if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
        }}
      >
        {/* hidden file input */}
        <input
          onChange={(e) => {
            const picked = Array.from(e?.target?.files || []);
            if (picked.length) setFiles((prev) => [...prev, ...picked]);
            e.currentTarget.value = "";
          }}
          multiple
          type="file"
          className="hidden"
          ref={fileRef}
          aria-hidden
          tabIndex={-1}
        />

        {/* attach button */}
        <button
          type="button"
          onClick={() => fileRef?.current?.click()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10"
          aria-label="Add attachment"
        >
          <Image src="/icons/Attachment.svg" alt="" width={20} height={20} />
        </button>

        {/* input area */}
        <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-emerald-500 dark:bg-zinc-900 dark:ring-white/10">
          <textarea
            placeholder="Send message…"
            className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            value={messageInput}
            style={{
              WebkitAppearance: "none",
              WebkitTextSizeAdjust: "100%",
              touchAction: "manipulation",
            }}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // no newline
                handleSendMessage(e);
              }
            }}
            rows={1}
            aria-label="Message"
          />

          {/* send button */}
          <button
            disabled={isPending || (!messageInput && files.length === 0)}
            type="submit"
            className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-400/10"
            aria-label="Send message"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </form>
    </>
  );
}
