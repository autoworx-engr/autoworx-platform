"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ArrowLeft, CircleX, MoreVertical, SendHorizontal } from "lucide-react";
import Image from "next/image";
import { pusher } from "@/lib/pusher/client";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import InvoiceEstimateModal from "./collaboration/InvoiceEstimateModal";
import CompanyProfileCard from "./collaboration/CompanyProfileCard";

type TMessage = {
  id?: number;
  message: string;
  senderCompanyId: number;
  senderUserName: string;
  senderUserImage?: string | null;
  createdAt: Date;
};

export default function CompanyMessageBox({
  company,
  currentUser,
  previousMessages,
  isMobile = false,
  onBack,
}: {
  company: {
    id: number;
    name: string;
    image?: string | null;
  };
  currentUser: any;
  previousMessages: any;
  isMobile?: boolean;
  onBack?: any;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const { data: session } = useSession();
  const attachmentRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [multiAttachmentFile, setMultiAttachmentFile] = useState<File[] | null>(
    null,
  );
  const [showAttachment, setShowAttachment] = useState(false);
  const currentCompanyId = session?.user?.companyId;
  const isEstimateAttachmentShow = pathname?.includes(
    "/communication/collaboration",
  );

  // 🔹 Load messages
  useEffect(() => {
    console.log("company id", company?.id);
    console.log("currentCompanyId", currentCompanyId);
    if (!company?.id || !currentCompanyId) return;

    async function fetchMessages() {
      try {
        const res = await fetch(
          `/api/communication/collaboration/messages/v2-messages?companyA=${currentCompanyId}&companyB=${company.id}&viewerCompanyId=${currentCompanyId}`,
        );

        const data = await res.json();
        console.log("data", data);
        if (data.success) {
          console.log("data", data);
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    }

    fetchMessages();
  }, [company?.id, currentCompanyId]);

  // 🔹 Auto scroll
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!currentCompanyId) return;

    const channel = pusher.subscribe(`company-${currentCompanyId}`);

    channel.bind("message", (data: any) => {
      // Only add if it's related to current open chat
      if (
        (data.fromCompanyId === company.id &&
          data.toCompanyId === currentCompanyId) ||
        (data.fromCompanyId === currentCompanyId &&
          data.toCompanyId === company.id)
      ) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`company-${currentCompanyId}`);
    };
  }, [company.id, currentCompanyId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !currentCompanyId || !company?.id) return;

    const trimmedMessage = message.trim();
    setMessage(""); // instant clear

    try {
      const res = await fetch("/api/pusher/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCompanyId: currentCompanyId,
          toCompanyId: company.id,
          senderUserId: session?.user?.id,
          message: trimmedMessage,
          section: "collaboration",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("Failed to send", data);
      }
    } catch (err) {
      console.error("Send error:", err);
    }
  }

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files!).map((file) => file);
    setShowAttachment(false);
    setMultiAttachmentFile(files);
  };

  return (
    <div className="flex h-[83vh] flex-col rounded-lg border bg-white">
      {/* 🔹 Header */}
      <div className="flex items-center justify-between bg-[#006D77] p-3 text-white">
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <ArrowLeft size={20} className="cursor-pointer" onClick={onBack} />
          )}

          <p className="font-semibold">{company.name}</p>
        </div>

        {/* Three Dot */}
        <MoreVertical
          size={20}
          className="cursor-pointer"
          onClick={() => setShowProfile(true)}
        />
      </div>

      {/* 🔹 Messages */}
      <div ref={messageBoxRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: any, index: number) => {
          const messageDate = format(new Date(msg.createdAt), "PPP");

          const previousMessage = messages[index - 1];
          const previousDate = previousMessage
            ? format(new Date(previousMessage.createdAt), "PPP")
            : null;

          const showDateSeparator = messageDate !== previousDate;

          const isOwn = msg.isOwnMessage;

          return (
            <div key={msg.id || index} className="mb-4">
              {showDateSeparator && (
                <div className="text-center text-xs text-gray-400 my-4">
                  {messageDate}
                </div>
              )}

              <div
                className={cn(
                  "flex flex-col mb-4",
                  isOwn ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm break-words",
                    isOwn
                      ? "bg-[#006D77] text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm",
                  )}
                >
                  {msg.message}
                </div>

                <p
                  className={cn(
                    "text-[11px] mt-1 px-1",
                    isOwn
                      ? "text-gray-400 text-right"
                      : "text-gray-500 text-left",
                  )}
                >
                  {format(new Date(msg.createdAt), "p")} ·{" "}
                  {msg.senderUser?.firstName} {msg.senderUser?.lastName}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔹 Input */}
      {/* attachments */}
      {multiAttachmentFile && multiAttachmentFile.length > 0 && (
        <div
          className={cn(
            "relative w-full rounded-lg border border-gray-200 bg-white shadow-md flex flex-col",
            "max-h-64",
          )}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex items-center justify-end bg-white px-3 py-2 shadow-sm border-b border-gray-100">
            <button
              onClick={() => setMultiAttachmentFile(null)}
              className="rounded-full bg-red-500/10 p-1.5 text-red-600 hover:bg-red-500/20 transition-colors"
              aria-label="Remove all attachments"
            >
              <CircleX size={20} />
            </button>
          </div>

          {/* Scrollable attachments */}
          <div className="thin-scrollbar max-h-64 overflow-y-auto px-4 pb-4">
            {/* Fixed responsive grid with minimum item width */}
            <div
              className="gap-3 pt-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              }}
            >
              {multiAttachmentFile?.map((attachmentFile) => (
                <div
                  key={attachmentFile.name}
                  className="group relative flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md hover:border-gray-300 min-w-0"
                >
                  {/* Remove single attachment */}
                  <button
                    // onClick={() => handleRemoveAttachment(attachmentFile.name)}
                    className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 rounded-full bg-white p-1 text-gray-700 shadow-md hover:text-red-500 hover:shadow-lg transition-all z-10 border border-gray-200"
                    aria-label={`Remove ${attachmentFile.name}`}
                  >
                    <CircleX size={14} />
                  </button>

                  {/* File preview container */}
                  <div className="relative mb-2">
                    {/* Image preview */}
                    {attachmentFile.type.includes("image") ? (
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-300">
                        <Image
                          src={URL.createObjectURL(attachmentFile)}
                          alt={attachmentFile.name}
                          className="object-cover"
                          fill
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      // Non-image file preview
                      <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                        <p className="text-xs font-semibold text-center px-1 leading-tight">
                          {attachmentFile.name
                            .split(".")
                            .pop()
                            ?.toUpperCase() || "FILE"}
                        </p>
                        <p className="text-[10px] mt-0.5 opacity-90">
                          {(attachmentFile.size / (1024 * 1024)).toFixed(1)}MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* File name */}
                  <p className="w-full text-center text-xs text-gray-700 leading-tight break-all line-clamp-2 px-1">
                    {attachmentFile.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => startTransition(() => handleSendMessage(e))}
        className="flex items-center gap-2 border-t bg-gray-100 p-3"
      >
        {/* attachment or estimate dropdown */}
        {showAttachment && (
          <div
            className={cn(
              "absolute -top-[55px] space-y-1",
              isEstimateAttachmentShow ? "-top-[55px]" : "-top-[27px]",
            )}
          >
            <p
              onClick={() => attachmentRef.current?.click()}
              className="cursor-pointer text-nowrap rounded-md border border-[#006D77] bg-background px-2 text-sm text-[#006D77] hover:bg-[#006D77] hover:text-white"
            >
              Attach Document/Media
            </p>
            {isEstimateAttachmentShow && (
              <InvoiceEstimateModal
                setShowAttachment={setShowAttachment}
                setMessages={setMessages}
                receiverCompany={company!}
              />
            )}
          </div>
        )}
        <Image
          onClick={() => setShowAttachment(!showAttachment)}
          className="cursor-pointer"
          src="/icons/Attachment.svg"
          width={24}
          height={24}
          alt="attachment"
        />
        <input
          multiple
          accept="*"
          ref={attachmentRef}
          onChange={handleAttachment}
          hidden
          type="file"
        />
        <input
          type="text"
          placeholder="Type message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006D77]"
        />
        <button disabled={pending} type="submit">
          <SendHorizontal className="text-[#006D77]" />
        </button>
      </form>

      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end md:hidden">
          <div className="w-[85%] bg-white h-full p-4 overflow-y-auto">
            <button
              onClick={() => setShowProfile(false)}
              className="mb-3 text-sm text-gray-500"
            >
              Close
            </button>

            <CompanyProfileCard company={company} />
          </div>
        </div>
      )}
    </div>
  );
}
