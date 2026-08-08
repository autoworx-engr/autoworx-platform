"use client";
import { SendHorizontal } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import useInstagramSendMutation from "../../../_hooks/useInstagramSendMutation";
import { useMessageDraft } from "../../../../_hooks/useMessageDraft";
import { useClientCommunicationStore } from "@/stores/client-store";
import { errorToast } from "@/lib/toast";

type TProps = { clientId: number };

export default function SendInstagram({ clientId }: TProps) {
  const { mutate, isPending } = useInstagramSendMutation(clientId);
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();

  const {
    draftText: messageInput,
    setDraftText: setMessageInput,
    clearDraft,
  } = useMessageDraft({
    section: "client",
    channel: "instagram",
    targetId: clientId,
  });
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
    if (!trimmed) return;

    if (clientConversationTrack) {
      setClientConversationTrack({
        ...clientConversationTrack,
        instagramLastMessage: trimmed,
        instagramLastBy: "Company",
        instagramIsRead: true,
      } as any);
    }

    clearDraft();
    setTimeout(adjustHeight, 0);

    mutate({
      clientId,
      message: trimmed,
      attachments: [],
      tempId: `temp-${Date.now()}`,
    });
  };

  return (
    <form
      className="flex items-center gap-2 rounded-b-md bg-zinc-100 px-2 pb-1 pt-2 dark:bg-zinc-800/60"
      onSubmit={handleSend}
    >
      <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-[#E1306C] dark:bg-zinc-900 dark:ring-white/10">
        <textarea
          ref={textareaRef}
          placeholder="Send an Instagram DM…"
          className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          value={messageInput}
          rows={1}
          onChange={(e) => setMessageInput(e.target.value)}
          onInput={() => adjustHeight()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={isPending || !messageInput}
          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-[#E1306C] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent"
          aria-label="Send message"
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
