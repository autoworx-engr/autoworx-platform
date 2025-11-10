"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Client, MailgunEmail, User } from "@prisma/client";
import { FullMessage } from "@/actions/dashboard/technician/recentMessages";
import { Message } from "./Message"; // Assuming Message component is styled separately
import { formatInternalAttachmentMessage } from "@/utils/formatAttachmentMessage";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { cn } from "@/lib/cn"; // Utility for merging Tailwind classes
import { Search as SearchIcon, MailWarning } from "lucide-react"; // Import for premium input

type TMessageContainerProps = {
  clientMessages?: (Client & {
    MailgunEmail: (MailgunEmail & { client: Client })[];
  })[];
  internalMessages?: FullMessage[];
  user: User;
  hasMessagePermission?: boolean;
};

export default function MessageContainer({
  clientMessages = [],
  internalMessages = [],
  user,
  hasMessagePermission = true,
}: TMessageContainerProps) {
  const [search, setSearch] = useState("");

  // Memoize filtered results to prevent unnecessary filtering on every render
  const filteredMessages = useMemo(() => {
    if (search === "") {
      return {
        client: clientMessages,
        internal: internalMessages,
      };
    }

    const normalizedSearchTerm = normalizeSearch(search.toLowerCase());

    const filteredClient = clientMessages.filter((msg) => {
      const fullName = `${msg?.firstName} ${msg?.lastName}`;
      return normalizeSearch(fullName)?.includes(normalizedSearchTerm);
    });

    const filteredInternal = internalMessages.filter((msg) => {
      const fromFullName = `${msg?.from?.firstName} ${msg?.from?.lastName}`;
      const toFullName = `${msg?.to?.firstName} ${msg?.to?.lastName}`; // FIX: Changed 'from' to 'to' here

      return (
        normalizeSearch(fromFullName)?.includes(normalizedSearchTerm) ||
        normalizeSearch(toFullName)?.includes(normalizedSearchTerm)
      );
    });

    return {
      client: filteredClient,
      internal: filteredInternal,
    };
  }, [search, clientMessages, internalMessages]);

  // Cleaned up useEffect logic, relying on useMemo instead of local state updates
  // The filter logic now runs inside useMemo for performance

  const { client: filteredClientMessages, internal: filteredInternalMessages } =
    filteredMessages;

  const hasMessages =
    filteredClientMessages.length > 0 || filteredInternalMessages.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-2">
      {!hasMessagePermission ? (
        // Redesigned Permission Denied State
        <div className="flex flex-1 flex-col items-center justify-center p-8 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
          <MailWarning className="w-8 h-8 text-amber-500 mb-3" />
          <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Access Restricted
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">
            You do not have access to view messages. Please contact your
            administrator.
          </span>
        </div>
      ) : (
        <>
          {/* Redesigned Search Input Field */}
          <div className="relative flex items-center mb-4 flex-shrink-0">
            <SearchIcon className="absolute left-3 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              className={cn(
                `
                h-10 w-full rounded-lg pl-10 pr-4 py-2 text-sm transition-all duration-300

                // Base style: Soft white/dark slate background
                bg-slate-50/70 dark:bg-slate-800/70
                border border-slate-200 dark:border-slate-700

                // Focus state: Indigo ring and shadow
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none

                // Hover effect
                hover:border-indigo-400 dark:hover:border-indigo-500
                `
              )}
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>

          {/* Message List Container - Filling remaining height and scrolling */}
          <div className="custom-scrollbar flex flex-1 flex-col space-y-3 overflow-y-auto w-full self-center pr-1">
            {/* 1. Client Messages (Sales focus) */}
            {filteredClientMessages.map((data) => {
              if (data.MailgunEmail?.length === 0) return null;

              // Get the latest email
              const latestEmail =
                data.MailgunEmail[data.MailgunEmail.length - 1];

              const emailBy = latestEmail.emailBy === "Company" ? "You: " : "";
              const messageContent =
                latestEmail.text.length > 50
                  ? latestEmail.text.slice(0, 50) + "..."
                  : latestEmail.text;

              // Using latestEmail.createdAt for key stability
              return (
                <Message
                  key={latestEmail.id}
                  userName={`${data.firstName} ${data.lastName}`}
                  message={`${emailBy} ${messageContent}`}
                  redirectUrl={`/dashboard/communication/client/${data.id}`}
                  communicationType="Client"
                  photoUrl={data.photo}
                  // timestamp={latestEmail.createdAt} // Pass timestamp for sorting/display
                />
              );
            })}

            {/* 2. Internal Messages (Technician focus) */}
            {filteredInternalMessages?.map((data: FullMessage) => {
              const targetUser =
                user?.id === data?.from?.id ? data?.to : data?.from;
              const userName = `${targetUser?.firstName || ""} ${targetUser?.lastName || ""}`;

              const messageBy = data?.from?.id === user?.id ? "You: " : "";

              const formattedMessage = formatInternalAttachmentMessage(
                data.message,
                data.attachment
              );

              return (
                <Message
                  key={data.id}
                  userName={userName}
                  message={`${messageBy}${formattedMessage}`}
                  redirectUrl={`/dashboard/communication/internal/?id=${targetUser?.id}`}
                  communicationType="Internal"
                  photoUrl={targetUser?.image} // Use the target user's image
                  // timestamp={data.createdAt} // Pass timestamp for sorting/display
                />
              );
            })}

            {/* Redesigned Empty State */}
            {!hasMessages && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
                <span
                  className="text-4xl mb-2 opacity-70"
                  role="img"
                  aria-label="mailbox"
                >
                  📪
                </span>
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  No Messages Found
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Try adjusting your search or check again later.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
