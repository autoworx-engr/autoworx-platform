"use client";
import { getEntitlements } from "@/actions/platform-billing/entitlements";
import { errorToast } from "@/lib/toast";
import { useServerGet } from "@/hooks/useServerGet";
import {
  clientListStore,
  useClientCommunicationStore,
} from "@/stores/client-store";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import { SendHorizontal } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import AttachmentInput from "../AttachmentInput";
import SmartReplyBar from "../sms/SmartReply";
import { useMessageDraft } from "../../../../_hooks/useMessageDraft";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ATTACHMENT_ACCEPT, mergeNewAttachments } from "../../../_utils";

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
      otherFiles.length === 1 ? "1 file" : `${otherFiles.length} files`,
    );
  }

  return parts.join(", ");
};

export default function SendMail({
  clientId,
  companyId,
  setConversations,
}: {
  clientId: number;
  companyId: number;
  setConversations: React.Dispatch<
    React.SetStateAction<
      | (MailgunEmail & {
          attachments: MailgunEmailAttachment[];
          user?: {
            firstName: string;
            lastName: string | null;
          } | null;
        })[]
      | undefined
    >
  >;
}) {
  const { clientList, setClientList } = clientListStore();
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();
  const { data: entitlements } = useServerGet(getEntitlements, companyId);
  const [pending, startTransition] = React.useTransition();
  const {
    draftText: messageInput,
    setDraftText: setMessageInput,
    clearDraft,
  } = useMessageDraft({
    section: "client",
    channel: "email",
    targetId: clientId,
  });

  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = (ta?: HTMLTextAreaElement | null) => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [messageInput]);

  const handleSendMessage = async (
    e:
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    e.preventDefault();

    if (!messageInput.trim() && files.length === 0) return;

    // Update conversation track optimistically
    const lastMessage =
      files.length > 0 ? formatAttachmentMessage(files) : messageInput.trim();

    if (clientConversationTrack) {
      setClientConversationTrack({
        ...clientConversationTrack,
        emailLastMessage: lastMessage,
        lastEmailBy: "Company",
        emailIsRead: true,
        sendAt: new Date(),
      });
    }

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

      const response = await fetch("/api/infobip/email/send", {
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
      clearDraft();
      setFiles([]);

      setTimeout(() => adjustTextareaHeight(), 0);

      const currentClient = clientList?.find(
        (client) => client.id === clientId,
      );
      const filterCurrentClient = clientList?.filter(
        (client) => client.id !== clientId,
      );
      currentClient && setClientList([currentClient, ...filterCurrentClient]);
      router.refresh();
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
      {/* 👇 AI Smart Replies */}
      <div className="bg-[#F3F4F6] px-2 pt-2">
        <SmartReplyBar
          clientId={clientId}
          companyId={companyId}
          draft={messageInput} // <-- pass the textarea value here
          onPick={(text) => setMessageInput(text)} // or append if you prefer
          isAllowed={entitlements?.success && entitlements.data?.aiSmartReplies}
        />
      </div>
      <form
        className="flex items-center gap-2 rounded-b-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800/60"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => handleSendMessage(event));
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files || []);
          if (dropped.length) {
            setFiles((prev) => mergeNewAttachments(prev, dropped));
          }
        }}
      >
        {/* hidden file input */}
        <input
          onChange={(e) => {
            const picked = Array.from(e?.target?.files || []);
            if (picked.length) {
              setFiles((prev) => mergeNewAttachments(prev, picked));
            }
            e.currentTarget.value = "";
          }}
          multiple
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          ref={fileRef}
          aria-hidden
          tabIndex={-1}
        />

        {/* attach button (accessible) */}
        <button
          type="button"
          onClick={() => fileRef?.current?.click()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10"
          aria-label="Add attachment"
          title="Add attachment"
        >
          <Image src="/icons/Attachment.svg" alt="" width={20} height={20} />
        </button>

        {/* input area */}
        <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-emerald-500 dark:bg-zinc-900 dark:ring-white/10">
          <textarea
            ref={textareaRef}
            placeholder="Send message…"
            className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            value={messageInput}
            style={{
              WebkitAppearance: "none",
              WebkitTextSizeAdjust: "100%",
              touchAction: "manipulation",
              height: "auto",
            }}
            onChange={(e) => {
              setMessageInput(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) =>
              adjustTextareaHeight(e.currentTarget)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                startTransition(() => handleSendMessage(e));
              }
            }}
            rows={1}
            aria-label="Message"
          />

          <button
            type="submit"
            className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-400/10"
            disabled={pending || (!messageInput && files.length === 0)}
            aria-label="Send message"
            title="Send"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
