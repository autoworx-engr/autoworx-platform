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
    async function fetchMessages() {
      const res = await fetch(`/api/company-messages/${company.id}`);
      const data = await res.json();
      setMessages(data);
    }
    fetchMessages();
  }, [company.id]);

  // 🔹 Auto scroll
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // 🔹 Real-time listener
  useEffect(() => {
    const channel = pusher.subscribe(`company-${company.id}`);

    channel.bind("message", (data: TMessage) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      channel.unbind("message");
      pusher.unsubscribe(`company-${company.id}`);
    };
  }, [company.id]);

  // 🔹 Send message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    const requestBody = {
      senderUserId: session?.user?.id,
      senderUserName: session?.user?.name,
      senderUserImage: session?.user?.image,
      senderCompanyId: currentCompanyId,
      receiverCompanyId: company.id,
      message,
    };

    const res = await fetch("/api/company-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const json = await res.json();

    if (json.success) {
      setMessage("");
    }
  }

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files!).map((file) => file);
    setShowAttachment(false);
    setMultiAttachmentFile(files);
  };

  let lastDate = "";

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
        {messages.map((msg, index) => {
          const messageDate = format(new Date(msg.createdAt), "PPP");

          const showDateSeparator = messageDate !== lastDate;
          lastDate = messageDate;

          const isOwn = msg.senderCompanyId === currentCompanyId;

          return (
            <div key={index}>
              {showDateSeparator && (
                <div className="text-center text-xs text-gray-400 my-2">
                  {messageDate}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3 text-sm shadow",
                  isOwn
                    ? "ml-auto bg-[#006D77] text-white"
                    : "bg-gray-100 text-gray-800",
                )}
              >
                <p>{msg.message}</p>

                {/* 🔹 Sender Name */}
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    isOwn ? "text-gray-200" : "text-gray-500",
                  )}
                >
                  {msg.senderUserName}
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
