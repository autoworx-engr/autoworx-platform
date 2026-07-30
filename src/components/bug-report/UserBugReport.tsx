"use client";
import React, { useEffect, useRef, useState } from "react";
import { BugIcon, MessageCircleWarning } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useGetAllBugReportsMessages } from "@/hooks/bug-reports-messages/useGetAllBugReportsMessages";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { createBugReportMessageByCompany } from "@/actions/bug-report-message/createBugReportMessageByCompany";
import { useGetAllCompanyBugReports } from "@/hooks/bug-reports/useGetAllCompanyBugReports";
import { createNewBugReportMessage } from "@/actions/bug-report-message/newBugReport";
import SelectorWithChildren from "@/app/(dashboard)/dashboard/components/SelectorWithChildren";
import toast from "react-hot-toast";
import { ReadMessage } from "@/actions/bug-report-message/ReadMessage";
import { MessageCard } from "./MessageCard";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { BugReportDropdownCard } from "./BugReportDropdownCard";
import { moduleOptions } from "@/constants/module.constant";
import { MessageBubbleSkeleton } from "./MessageBubbleSkeleton";
import { TBugReportMessage } from "@/types/BugReportMessage";
import OptimisticMessageCard from "./OptimisticMessageCard";
import { stateStore } from "@/stores/stateStore";

interface Contact {
  id: string;
  name: string;
  type: "company" | "client";
  reportedBugs: number;
  avatar: string;
}

const UserBugReport = () => {
  const {
    isBugOpen: isDropdownOpen,
    setIsBugOpen: setIsDropdownOpen,
    isNewBugOpen,
    setIsNewBugOpen,
  } = stateStore();
  // const [isNewBugOpen, setIsNewBugOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [reportMessage, setReportMessage] = useState<string>("");

  const {
    data,
    isFetching,
    isLoading,
    refetch: companyBugRefetch,
  } = useGetAllCompanyBugReports();
  const {
    data: ReportMessages,
    refetch,
    isFetching: messageFetching,
    isLoading: messageLoading,
  } = useGetAllBugReportsMessages(selectedContact?.id);

  const filteredContacts = data
    ? data?.filter((contact: any) =>
        contact.BugReportMessage?.[contact.BugReportMessage.length - 1]?.subject
          ?.toLowerCase()
          ?.includes(searchQuery.toLowerCase()),
      )
    : [];

  useEffect(() => {
    setReportMessage("");
  }, [ReportMessages, companyBugRefetch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ReportMessages, loading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        // setIsNewBugOpen(false);
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
        senderType: "super_admin",
      });
    };

    readMessage();
  }, [selectedContact, setSelectedContact, ReadMessage]);

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDropdownOpen(false);
    setIsNewBugOpen(false);
    setSearchQuery("");
  };

  const handleCloseChat = () => {
    setSelectedContact(null);
    setIsNewBugOpen(false);
    setIsDropdownOpen(false);
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

      await createBugReportMessageByCompany({
        bugReportId: selectedContact?.id,
        content: currentMessage,
        attachments:
          uploadedAttachmentData.length > 0
            ? uploadedAttachmentData
            : undefined,
      });

      setSelectedFiles([]);
      refetch();
      setLoading(false);
    } catch (error) {
      setMessage(currentMessage);
      setLoading(false);
      errorHandler(error);
    }
  };

  const handleNewBugReport = async () => {
    if (!subject) {
      toast.error(
        "Oops! Select the module for your issue so we can help faster.",
      );
      return;
    }

    if (!message.trim()) {
      toast.error(
        "Don’t forget to describe the issue so we can assist you faster!",
      );
      return;
    }
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

      // Step 2: Create new bug report message
      const res = await createNewBugReportMessage({
        content: currentMessage,
        subject,
        senderType: "company",
        attachments:
          uploadedAttachmentData.length > 0
            ? uploadedAttachmentData
            : undefined,
      });

      if (res.type === "success") {
        setMessage("");
        setSubject("");
        setSelectedModule(null);
        setIsNewBugOpen(false);
        setSelectedFiles([]);
        setIsDropdownOpen(true);
        companyBugRefetch();
        setLoading(false);
      } else {
        toast.error("Something went wrong");
      }
    } catch (err) {
      setLoading(false);
      errorHandler(err);
    }
  };

  const handleModuleSelect = (value: string | null, option: any) => {
    setSelectedModule(value);
    if (option) {
      setSubject(option.label);
    } else {
      setSubject("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      // Optional: Prevent duplicates (based on name + size)
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

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div ref={dropdownRef}>
      {/* Main Button */}
      <div>
        {/* Dropdown */}
        {isDropdownOpen && (
          <BugReportDropdownCard
            isAdmin={false}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNew={() => {
              setIsNewBugOpen(true);
              setIsDropdownOpen(false);
              setSelectedContact(null);
            }}
            showNewButton={true}
            isLoading={isLoading || isFetching}
            bugReports={filteredContacts}
            onContactSelect={handleContactSelect}
          />
        )}
      </div>

      {/* Chat Interface */}
      {selectedContact && (
        <div className="fixed inset-0 z-10">
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
              type="regular"
              selectedContact={selectedContact}
              onClose={handleCloseChat}
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
                      isAdminView={false}
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

      {/* New report create */}
      {isNewBugOpen && (
        <div className="fixed inset-0 z-10">
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
              type="new"
              onClose={handleCloseChat}
              moduleSelectorProps={{
                element: (
                  <SelectorWithChildren
                    options={moduleOptions}
                    value={selectedModule!}
                    onChange={handleModuleSelect}
                    placeholder="Choose Module..."
                    clearable
                    searchable
                    className="w-full text-black"
                    maxHeight="250px"
                  />
                ),
              }}
            />

            <CardContent className="custom-scrollbar h-80 overflow-y-auto bg-gray-50 p-4">
              {loading && selectedFiles?.length > 0 ? (
                <OptimisticMessageCard
                  loading={loading}
                  message={reportMessage}
                  selectedContact={selectedContact}
                  selectedFiles={selectedFiles}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-gray-500">
                  <BugIcon className="h-10 w-10 text-[#006D77]" />
                  <h3 className="text-lg font-semibold text-gray-700">
                    No Conversation Yet
                  </h3>
                  <p className="text-sm">
                    Start a new bug report and share your issue with us.
                  </p>
                </div>
              )}
            </CardContent>

            {/* Message Input */}
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSend={handleNewBugReport}
              selectedFiles={selectedFiles}
              handleFileChange={handleFileChange}
              handleRemoveFile={handleRemoveFile}
              loading={loading}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserBugReport;
