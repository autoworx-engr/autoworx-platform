"use client";
import { SendHorizontal } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import useMessengerSendMutation from "../../../_hooks/useMessengerSendMutation";
import AttachmentInput from "../AttachmentInput";
import { useClientCommunicationStore } from "@/stores/client-store";
import { errorToast } from "@/lib/toast";
import { ATTACHMENT_ACCEPT, mergeNewAttachments } from "../../../_utils";

type TProps = { clientId: number };

export default function SendMessenger({ clientId }: TProps) {
  const { mutate, isPending } = useMessengerSendMutation(clientId);
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();

  const [messageInput, setMessageInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [messageInput]);

  const handleSend = async (
    e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed && files.length === 0) return;

    let uploadedAttachments: {
      url: string;
      name: string;
      attachmentType: string;
    }[] = [];

    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        uploadedAttachments = (json?.data ?? []).map(
          (url: string, i: number) => ({
            url,
            name: files[i]?.name ?? "attachment",
            attachmentType: files[i]?.type.startsWith("image/")
              ? "image"
              : "file",
          }),
        );
      } catch {
        errorToast("Failed to upload attachment");
        return;
      }
    }

    if (clientConversationTrack) {
      setClientConversationTrack({
        ...clientConversationTrack,
        messengerLastMessage: trimmed || `${files.length} attachment(s)`,
        messengerLastBy: "Company",
        messengerIsRead: true,
        sendAt: new Date(),
      });
    }

    setMessageInput("");
    setFiles([]);
    setTimeout(adjustHeight, 0);

    mutate({
      clientId,
      message: trimmed,
      attachments: uploadedAttachments,
      tempId: `temp-${Date.now()}`,
    });
  };

  return (
    <>
      <AttachmentInput
        className="bottom-[50px]"
        multiAttachmentFile={files}
        onAllRemove={() => setFiles([])}
        onRemoveAttachment={(name) =>
          setFiles((prev) => prev.filter((f) => f.name !== name))
        }
      />

      <form
        className="flex items-center gap-2 rounded-b-md bg-zinc-100 px-2 pb-1 pt-2 dark:bg-zinc-800/60"
        onSubmit={handleSend}
      >
        <input
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          ref={fileRef}
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
            if (picked.length) {
              setFiles((prev) => mergeNewAttachments(prev, picked));
            }
            e.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-white/10"
          aria-label="Add attachment"
        >
          <Image src="/icons/Attachment.svg" alt="" width={20} height={20} />
        </button>

        <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-[#0866FF] dark:bg-zinc-900 dark:ring-white/10">
          <textarea
            ref={textareaRef}
            placeholder="Send a Messenger message…"
            className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
            value={messageInput}
            rows={1}
            onChange={(e) => setMessageInput(e.target.value)}
            onInput={(e) => adjustHeight()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isPending || (!messageInput && files.length === 0)}
            className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-[#0866FF] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent"
            aria-label="Send message"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
      </form>
    </>
  );
}
