"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { pusher } from "@/lib/pusher/client";
import { format } from "date-fns";
import {
  ArrowLeft,
  CircleX,
  CloudDownload,
  MoreVertical,
  SendHorizontal,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import CompanyProfileCard from "./collaboration/CompanyProfileCard";
import InvoiceEstimateModal from "./collaboration/InvoiceEstimateModal";

type TMessage = {
  id?: number;
  message: string;
  senderCompanyId: number;
  senderUserName: string;
  senderUserImage?: string | null;
  createdAt: Date;
};

const formatAttachmentSize = (fileSize: unknown) => {
  const sizeInBytes =
    typeof fileSize === "string" ? parseFloat(fileSize) : Number(fileSize);

  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return "Unknown size";
  }

  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
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
  onBack?: () => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const { data: session } = useSession();
  const attachmentRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLImageElement>(null);
  const pathname = usePathname();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [multiAttachmentFile, setMultiAttachmentFile] = useState<File[] | null>(
    null,
  );
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const [showAttachment, setShowAttachment] = useState(false);
  const currentCompanyId = session?.user?.companyId;
  const isEstimateAttachmentShow = pathname?.includes(
    "/communication/collaboration",
  );

  // 🔹 Load messages
  useEffect(() => {
    if (!companyId || !currentCompanyId) return;

    async function fetchMessages() {
      try {
        const res = await fetch(
          `/api/communication/collaboration/messages/v2-messages?companyA=${currentCompanyId}&companyB=${companyId}&viewerCompanyId=${currentCompanyId}`,
        );

        const data = await res.json();

        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        // console.error("Failed to fetch messages", error);
      }
    }

    fetchMessages();
  }, [companyId, currentCompanyId]);

  // 🔹 Auto scroll
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!currentCompanyId) return;

    const channel = pusher.subscribe(`company-${currentCompanyId}`);

    // channel.bind("message", (data: any) => {
    //   console.log("data", data);
    //   if (
    //     (data.fromCompanyId === currentCompanyId &&
    //       data.toCompanyId === companyId) ||
    //     (data.fromCompanyId === companyId &&
    //       data.toCompanyId === currentCompanyId)
    //   ) {
    //     setMessages((prev) => [...prev, data]);
    //   }
    // });

    channel.bind("message", (data: any) => {
      const fromId = Number(data.fromCompanyId);
      const toId = Number(data.toCompanyId);
      const currentId = Number(currentCompanyId);
      const chatId = Number(companyId);
      console.log({
        fromId,
        toId,
        currentId,
        chatId,
      });
      if (
        (fromId === currentId && toId === chatId) ||
        (fromId === chatId && toId === currentId)
      ) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`company-${currentCompanyId}`);
    };
  }, [companyId, currentCompanyId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        showAttachment &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        toggleRef.current &&
        !toggleRef.current.contains(target) &&
        !(target instanceof Element && target.closest('[role="dialog"]'))
      ) {
        setShowAttachment(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachment]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompanyId || !companyId) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage && !multiAttachmentFile) return;
    setMessage("");

    try {
      let uploadedFiles = null;

      // 🔹 Upload attachments first
      if (multiAttachmentFile && multiAttachmentFile.length > 0) {
        const formData = new FormData();

        multiAttachmentFile.forEach((file) => {
          formData.append("file", file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        uploadedFiles = uploadData.data?.map((url: string, index: number) => {
          const file = multiAttachmentFile[index];

          return {
            fileName: file.name,
            fileType: file.type,
            fileUrl: url,
            fileSize: file.size,
          };
        });
      }

      const res = await fetch("/api/pusher/collaboration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCompanyId: currentCompanyId,
          toCompanyId: Number(companyId),
          senderUserId: session?.user?.id,
          message: trimmedMessage || null,
          attachmentFiles: uploadedFiles,
          section: "collaboration",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        // console.error("Failed to send", data);
      }
      if (data.success) {
        setMessage("");
        setMultiAttachmentFile(null);
      }
    } catch (err) {
      // console.error("Send error:", err);
    }
  }

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files!).map((file) => file);
    setShowAttachment(false);
    setMultiAttachmentFile(files);
  };

  const handleRemoveAttachment = (fileName: string) => {
    setMultiAttachmentFile(
      (multiFiles) =>
        multiFiles && multiFiles?.filter((file) => file?.name !== fileName),
    );
  };

  const handleDownload = async (fileUrl: string | null) => {
    // const response = await fetch(fileUrl as string);
    // const responseBlob = await response.blob();
    // const blobURL = URL.createObjectURL(responseBlob);
    // const link = document.createElement("a");
    // link.href = blobURL;
    // link.setAttribute("download", fileUrl?.split("/").pop()!);
    // document.body.appendChild(link);
    // link.click();
    // link.remove();
    fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`flex ${onBack ? "h-full" : "h-[83vh]"} flex-col rounded-lg border bg-white`}
    >
      {/* 🔹 Header */}
      <div
        className={`flex items-center justify-between bg-[#006D77] p-3 text-white ${onBack && "sticky top-0 right-0 left-0"}`}
      >
        {/* Left Side */}
        <div className="flex items-center gap-2">
          {onBack && (
            <ArrowLeft size={20} className="cursor-pointer" onClick={onBack} />
          )}

          <p className="font-semibold">{company.name}</p>
        </div>

        {/* Three Dot */}
        {onBack && (
          <MoreVertical
            size={20}
            className="cursor-pointer"
            onClick={() => setShowProfile(true)}
          />
        )}
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
                  "flex flex-col space-y-2",
                  isOwn ? "items-end" : "items-start",
                )}
              >
                {/* Attachments */}
                {msg?.attachments &&
                  msg?.attachments.length > 0 &&
                  msg?.attachments.map((attachment: any) => {
                    return (
                      <div
                        key={attachment.fileUrl}
                        className={cn(
                          "flex items-center gap-2",
                          isOwn ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {attachment.fileType?.includes("image") ? (
                          <Image
                            src={attachment.fileUrl}
                            alt=""
                            width={200}
                            height={200}
                            className="rounded-md border cursor-pointer"
                          />
                        ) : attachment.fileType?.includes("video") ? (
                          <video
                            src={attachment.fileUrl}
                            className="h-40 w-60 rounded-md border cursor-pointer"
                            controls
                          />
                        ) : (
                          <div className="rounded-md bg-[#006D77] px-4 py-2 text-white">
                            <p className="text-sm">{attachment?.fileName}</p>
                            <p className="text-xs">
                              {attachment?.fileSize && attachment?.fileSize}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => handleDownload(attachment?.fileUrl)}
                        >
                          <CloudDownload
                            size={22}
                            className="cursor-pointer text-gray-400"
                          />
                        </button>
                      </div>
                    );
                  })}

                {/* Request Estimate */}
                {msg?.requestEstimate && (
                  <>
                    {msg?.isOwnMessage ? (
                      <InvoiceModal
                        invoiceId={msg?.requestEstimate?.invoiceId}
                        buttonChild={
                          <button className="w-96 rounded-md bg-[#006D77] p-1">
                            <div className="flex items-center justify-center gap-x-2 rounded-md border border-white p-5">
                              <Image
                                src="/icons/navbar/Invoices.svg"
                                alt="estimate icon"
                                width={20}
                                height={20}
                              />
                              <p className="font-semibold text-white">
                                Requested an Estimate
                              </p>
                            </div>
                          </button>
                        }
                        isShowEdit={false}
                      />
                    ) : (
                      <Link
                        href={`/dashboard/estimate/edit/${msg?.requestEstimate.invoiceId}`}
                        className={cn(
                          "w-96 rounded-md bg-[#006D77] p-1",
                          !msg?.isOwnMessage && "bg-[#D9D9D9]",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center gap-x-2 rounded-md border border-white p-5",
                            !msg?.isOwnMessage && "border-[#006D77]",
                          )}
                        >
                          <Image
                            src="/icons/navbar/Invoices.svg"
                            alt="estimate icon"
                            width={20}
                            height={20}
                          />
                          <p
                            className={cn(
                              "font-semibold text-white",
                              !msg?.isOwnMessage && "text-[#006D77]",
                            )}
                          >
                            Requested an Estimate
                          </p>
                        </div>
                      </Link>
                    )}
                  </>
                )}

                {/* Message Bubble */}
                {msg.message && (
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
                )}

                {/* Timestamp */}
                <p
                  className={cn(
                    "text-[11px] mt-1",
                    isOwn
                      ? "text-gray-400 text-right"
                      : "text-gray-500 text-left",
                  )}
                >
                  {format(new Date(msg?.createdAt), "p")} ·
                  {msg?.senderUser?.firstName + " " + msg?.senderUser?.lastName}
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
                    onClick={() => handleRemoveAttachment(attachmentFile.name)}
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
                    ) : attachmentFile.type.includes("video") ? (
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-300 bg-black">
                        <video
                          src={URL.createObjectURL(attachmentFile)}
                          className="h-full w-full object-cover"
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
        className={`flex relative items-center gap-2 border-t bg-gray-100 p-3 ${onBack && "sticky bottom-0 right-0 left-0"}`}
      >
        {/* attachment or estimate dropdown */}
        {showAttachment && (
          <div
            ref={dropdownRef}
            className={cn(
              "absolute z-50 -top-[55px] space-y-1",
              isEstimateAttachmentShow ? "-top-[55px]" : "-top-[27px]",
            )}
          >
            <p
              onClick={() => attachmentRef.current?.click()}
              className="cursor-pointer text-nowrap rounded-md border border-[#006D77] bg-background px-2 text-sm text-[#006D77] hover:bg-[#006D77] hover:text-white"
            >
              Attach Document/Media
            </p>
            {isEstimateAttachmentShow && currentCompanyId && (
              <InvoiceEstimateModal
                setShowAttachment={setShowAttachment}
                setMessages={setMessages}
                receiverCompany={company!}
                currentCompanyId={currentCompanyId}
              />
            )}
          </div>
        )}
        <Image
          ref={toggleRef}
          onClick={() => setShowAttachment(!showAttachment)}
          className="cursor-pointer"
          src="/icons/Attachment.svg"
          width={24}
          height={24}
          alt="attachment"
        />
        <input
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          ref={attachmentRef}
          onChange={handleAttachment}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = "";
          }}
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
          <div className="w-full bg-white h-full p-4 overflow-y-auto">
            <button
              onClick={() => setShowProfile(false)}
              className="mb-3 text-sm text-gray-500"
            >
              <ArrowLeft size={20} className="cursor-pointer" />
            </button>

            <CompanyProfileCard
              companyId={company?.id}
              currentCompanyId={currentCompanyId!}
              userId={Number(session?.user?.id!)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
