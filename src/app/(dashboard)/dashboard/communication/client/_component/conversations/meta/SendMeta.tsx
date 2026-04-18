"use client";

import AttachmentInput from "../AttachmentInput";
import { useClientCommunicationStore } from "@/stores/client-store";
import { errorToast } from "@/lib/toast";
import { SendHorizontal } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import useMetaSendMutation from "../../../_hooks/useMetaSendMutation";

type TProps = {
  clientId: number;
  platform: "INSTAGRAM" | "FACEBOOK";
  onPlatformChange: (p: "INSTAGRAM" | "FACEBOOK") => void;
};

const PLATFORM_STYLES = {
  INSTAGRAM: "bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white",
  FACEBOOK: "bg-[#1877F2] text-white",
};

export default function SendMeta({
  clientId,
  platform,
  onPlatformChange,
}: TProps) {
  const { mutate, isPending } = useMetaSendMutation(clientId);
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();

  const [files, setFiles] = useState<File[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed && files.length === 0) return;

    const tempId = `temp-${Date.now()}`;

    if (clientConversationTrack) {
      setClientConversationTrack({
        ...clientConversationTrack,
        metaLastMessage: trimmed || `${files.length} attachment(s)`,
        metaIsRead: true,
        lastMessageBy: "Company",
        sendAt: new Date(),
      });
    }

    setMessageInput("");
    setFiles([]);
    setTimeout(adjustHeight, 0);

    try {
      mutate({ id: tempId, clientId, message: trimmed, platform, files });
    } catch {
      errorToast("Error sending message");
    }
  };

  const placeholder =
    platform === "INSTAGRAM"
      ? "Send Instagram message…"
      : "Send Facebook message…";

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

      {/* Platform toggle strip */}
      <div className="flex items-center gap-1.5 bg-[#F3F4F6] px-2 pt-2 pb-1">
        {(["INSTAGRAM", "FACEBOOK"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPlatformChange(p)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              platform === p
                ? PLATFORM_STYLES[p]
                : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
            }`}
          >
            {p === "INSTAGRAM" ? "Instagram" : "Facebook"}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 rounded-b-md bg-zinc-100 px-2 pb-1 pt-2 dark:bg-zinc-800/60"
        onSubmit={handleSend}
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
        <input
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
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

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10"
          aria-label="Add attachment"
        >
          <Image src="/icons/Attachment.svg" alt="" width={20} height={20} />
        </button>

        <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-emerald-500 dark:bg-zinc-900 dark:ring-white/10">
          <textarea
            placeholder={placeholder}
            ref={textareaRef}
            className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            value={messageInput}
            style={{ WebkitAppearance: "none", height: "auto" }}
            onChange={(e) => {
              setMessageInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            rows={1}
            aria-label="Message"
          />
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
