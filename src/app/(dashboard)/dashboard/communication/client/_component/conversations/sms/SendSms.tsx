"use client";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { getEntitlements } from "@/actions/platform-billing/entitlements";
import { getCompany } from "@/actions/settings/getCompany";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast } from "@/lib/toast";
import {
  clientListStore,
  useClientCommunicationStore,
} from "@/stores/client-store";
import { CirclePause, Mic, MicOff, SendHorizontal } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import useSmsSendMutation from "../../../_hooks/useSmsSendMutation";
import AttachmentInput from "../AttachmentInput";
import SmartReplyBar from "./SmartReply";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import UpgradePlanBanner from "@/components/UpgradePlanBanner";
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

type TProps = {
  clientId: number;
  companyId: number;
  canUseSms?: boolean;
};

export default function SendSms({
  clientId,
  companyId,
  canUseSms = true,
}: TProps) {
  const { clientList, setClientList } = clientListStore();
  const { mutate, isSuccess, isPending } = useSmsSendMutation(clientId);
  const { clientConversationTrack, setClientConversationTrack } =
    useClientCommunicationStore();

  const { data } = useServerGet(getCompany);
  const { data: entitlements } = useServerGet(getEntitlements, companyId);
  const currentUser = useGetCurrentUser();
  const [files, setFiles] = useState<File[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!canUseSms) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const voiceFile = new File([blob], `voice_note_${Date.now()}.${ext}`, {
          type: mimeType,
        });
        setFiles((prev) => [...prev, voiceFile]);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      );
    } catch {
      errorToast("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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
    e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();

    if (!canUseSms) {
      errorToast("SMS is not enabled for your plan");
      return;
    }

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
      user: {
        firstName: currentUser?.name || "",
        lastName: "",
      },
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
    setTimeout(() => adjustTextareaHeight(), 0);

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
      {!canUseSms && (
        <div className="mb-3">
          <UpgradePlanBanner
            title="SMS is not available on your plan"
            description="Upgrade to enable SMS conversations with clients from this screen."
            ctaLabel="Upgrade Plan"
          />
        </div>
      )}
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
          isAllowed={entitlements?.success && entitlements.data?.aiSmartReplies}
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
          if (!canUseSms) return;
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

        {/* attach button */}
        <button
          type="button"
          onClick={() => fileRef?.current?.click()}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10 ${!canUseSms ? "cursor-not-allowed opacity-60" : ""}`}
          aria-label="Add attachment"
          disabled={!canUseSms}
        >
          <Image src="/icons/Attachment.svg" alt="" width={20} height={20} />
        </button>

        {/* voice note record button */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 active:scale-[0.98] dark:hover:bg-red-400/10 animate-pulse"
            aria-label="Stop recording"
            title={`Recording… ${formatRecordingTime(recordingSeconds)}`}
          >
            <CirclePause className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-200/80 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/10 ${!canUseSms ? "cursor-not-allowed opacity-60" : ""}`}
            aria-label="Record voice note"
            title="Record voice note"
            disabled={!canUseSms}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {/* recording timer label */}
        {isRecording && (
          <span className="text-xs font-mono text-red-600 select-none">
            {formatRecordingTime(recordingSeconds)}
          </span>
        )}

        {/* input area */}
        <div className="flex w-full items-center gap-2 rounded-md bg-white ring-1 ring-zinc-200 focus-within:ring-emerald-500 dark:bg-zinc-900 dark:ring-white/10">
          <textarea
            placeholder={
              canUseSms ? "Send message…" : "SMS not available on this plan"
            }
            ref={textareaRef}
            className="max-h-28 min-h-10 w-full resize-none rounded-md border-none bg-transparent px-3 py-2 text-[15px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            value={messageInput}
            style={{
              WebkitAppearance: "none",
              WebkitTextSizeAdjust: "100%",
              touchAction: "manipulation",
              height: "auto",
            }}
            onChange={(e) => {
              if (!canUseSms) return;
              setMessageInput(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) =>
              canUseSms ? adjustTextareaHeight(e.currentTarget) : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // no newline
                handleSendMessage(e);
              }
            }}
            rows={1}
            aria-label="Message"
            disabled={!canUseSms}
          />

          {/* send button */}
          <button
            disabled={
              isPending || !canUseSms || (!messageInput && files.length === 0)
            }
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
