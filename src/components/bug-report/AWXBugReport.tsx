"use client";
import { createBugReportMessageBySuperAdmin } from "@/actions/bug-report-message/createBugReportMessageBySuperAdmin";
import { ReadMessage } from "@/actions/bug-report-message/ReadMessage";
import { resolvedBugReport } from "@/actions/bug-report-message/resolvedBugReport";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useGetAllBugReportsMessages } from "@/hooks/bug-reports-messages/useGetAllBugReportsMessages";
import { useGetAllBugReports } from "@/hooks/bug-reports/useGetAllBugReports";
import { useBugReportAdminStore } from "@/stores/bugReportAdminStore";
import { TBugReportMessage } from "@/types/BugReportMessage";
import { MessageCircleWarning } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "../ui/card";
import { BugReportDropdownCard } from "./BugReportDropdownCard";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageBubbleSkeleton } from "./MessageBubbleSkeleton";
import { MessageCard } from "./MessageCard";
import OptimisticMessageCard from "./OptimisticMessageCard";

interface Contact {
  id: string;
  name: string;
  type: "company" | "client";
  reportedBugs: number;
  avatar: string;
}

const AWXBugReport = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { selectedContact, setSelectedContact } = useBugReportAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportMessage, setReportMessage] = useState<string>("");

  const {
    data,
    isFetching,
    isLoading,
    refetch: bugReportRefetch,
  } = useGetAllBugReports(50);

  const filteredContacts =
    data?.reports?.filter((contact: any) =>
      contact.BugReportMessage?.[contact.BugReportMessage.length - 1]?.subject
        ?.toLowerCase()
        ?.includes(searchQuery.toLowerCase()),
    ) ?? [];

  const {
    data: ReportMessages,
    refetch,
    isFetching: messageFetching,
    isLoading: messageLoading,
  } = useGetAllBugReportsMessages(selectedContact?.id);

  useEffect(() => {
    setReportMessage("");
  }, [ReportMessages, refetch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ReportMessages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      event.stopPropagation();
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) {
      setSearchQuery("");
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!selectedContact) return;
    const readMessage = async () => {
      await ReadMessage({
        bugReportId: selectedContact.id,
        senderType: "company",
      });
    };

    readMessage();
  }, [selectedContact]);

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleResolve = async () => {
    try {
      await resolvedBugReport({
        bugReportId: selectedContact.id,
        isResolved: true,
      });
      await createBugReportMessageBySuperAdmin({
        bugReportId: selectedContact?.id,
        companyId: selectedContact?.company?.id,
        content:
          "Your reported issue has been resolved, thanks for your patience. If you face any further problems, please don’t hesitate to create a new bug report.",
      });
      setSelectedContact(null);
      setIsDropdownOpen(false);
      setIsDropdownOpen(true);
      setSearchQuery("");
      bugReportRefetch();
    } catch (error) {
      errorHandler(error);
    }
  };

  const handleCloseChat = () => {
    setSelectedContact(null);
    setIsDropdownOpen(true);
    refetch();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      const newFiles = filesArray.filter(
        (file) =>
          !selectedFiles.some(
            (existing) =>
              existing.name === file.name && existing.size === file.size,
          ),
      );

      setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleSendMessage = async () => {
    const currentMessage = message;
    try {
      setLoading(true);
      setReportMessage(currentMessage);
      setMessage("");
      let uploadedAttachmentData: any = [];

      // Step 1: Upload files
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("file", file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          toast.error("File upload failed");
          setMessage(currentMessage);
          setLoading(false);
          return;
        }

        const { data: uploadedUrls }: { data: string[] } =
          await uploadRes.json();

        uploadedAttachmentData = uploadedUrls.map((url, index) => {
          const file = selectedFiles[index];
          return {
            fileUrl: url,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          };
        });
      }
      const res = await createBugReportMessageBySuperAdmin({
        bugReportId: selectedContact?.id,
        companyId: selectedContact?.company?.id,
        content: currentMessage,
        attachments:
          uploadedAttachmentData.length > 0
            ? uploadedAttachmentData
            : undefined,
      });
      setMessage("");
      setSelectedFiles([]);
      refetch();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      errorHandler(error);
    }
  };
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div ref={dropdownRef}>
      {/* Main Button */}
      <div className="relative">
        <button
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setSelectedContact(null);
          }}
          className="flex items-center"
        >
          <MessageCircleWarning className="mr-2 h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-primary" />
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <BugReportDropdownCard
            isAdmin={true}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isLoading || isFetching}
            bugReports={filteredContacts}
            onContactSelect={handleContactSelect}
          />
        )}
      </div>

      {/* Chat Interface */}
      {selectedContact && (
        <div className="fixed inset-0 z-10 px-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm h-screen"></div>
          <Card
            className="absolute border rounded-lg shadow-[50px] border-gray-400 top-20 left-1/2 -translate-x-1/2 sm:translate-x-0 
            sm:left-auto sm:right-16 
            md:right-10 md:top-0 
            z-20 mx-auto w-full max-w-xs md:max-w-md 
            transition-all duration-300 ease-in-out"
          >
            <div className="px-3 py-1 text-sm text-[#797979]">Bug Report</div>
            <ChatHeader
              type="super_admin"
              selectedContact={selectedContact}
              onClose={handleCloseChat}
              onResolve={handleResolve}
            />

            <CardContent className="custom-scrollbar h-80 overflow-y-auto bg-gray-50 p-4">
              {!loading && messageLoading ? (
                <>
                  <MessageBubbleSkeleton isSender={true} />
                  <MessageBubbleSkeleton isSender={false} />
                  <MessageBubbleSkeleton isSender={true} />
                </>
              ) : (
                <div className="space-y-4">
                  {ReportMessages?.map((messages: TBugReportMessage) => (
                    <MessageCard
                      key={messages.id}
                      messages={messages}
                      selectedContact={selectedContact}
                      isAdminView={true}
                    />
                  ))}

                  {loading && selectedFiles?.length > 0 && (
                    <OptimisticMessageCard
                      loading={loading}
                      message={reportMessage}
                      selectedContact={selectedContact}
                      selectedFiles={selectedFiles}
                    />
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </CardContent>

            {/* Message Input */}
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSend={handleSendMessage}
              selectedFiles={selectedFiles}
              handleFileChange={handleFileChange}
              handleRemoveFile={handleRemoveFile}
              isResolved={selectedContact.isResolved}
              loading={loading}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default AWXBugReport;
