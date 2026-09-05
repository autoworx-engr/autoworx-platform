"use client";
import React, { useEffect, useState, useCallback } from "react";
import { User } from "@prisma/client";
import { Message } from "./Message"; // Assuming Message component is styled separately
import { formatInternalAttachmentMessage } from "@/utils/formatAttachmentMessage";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { Search as SearchIcon, Loader2 } from "lucide-react"; // Import for premium input
import InfiniteScroll from "react-infinite-scroll-component";
import { useRecentMessagesSeen } from "./_hooks/useRecentMessagesSeen";
import { useClientMessagesList } from "./_hooks/useClientMessagesList";
import { TClientMessage, TInternalMessage } from "./_hooks/recentMessageTypes";

type TMessageContainerProps = {
  initialClientMessages?: TClientMessage[];
  internalMessages?: TInternalMessage[];
  user: User;
  canSeeClientMessages?: boolean;
};

export default function MessageContainer({
  initialClientMessages = [],
  internalMessages = [],
  user,
  canSeeClientMessages = false,
}: TMessageContainerProps) {
  const [search, setSearch] = useState("");
  const [internalState, setInternalState] = useState(internalMessages);

  const {
    clientMessages,
    setClientMessages,
    hasMore,
    fetchMoreClients,
    runSearch,
  } = useClientMessagesList({
    initialClientMessages,
    canSeeClientMessages,
    search,
  });

  // The server component re-renders this box on navigation; keep local state
  // in step with the freshly fetched lists.
  useEffect(() => {
    setInternalState(internalMessages);
  }, [internalMessages]);

  const internalCounterpartId = useCallback(
    (message: TInternalMessage) =>
      user?.id === message?.from?.id ? message?.to?.id : message?.from?.id,
    [user?.id],
  );

  useRecentMessagesSeen({
    userId: user?.id,
    companyId: user?.companyId,
    setInternalMessages: setInternalState,
    setClientMessages,
    counterpartId: internalCounterpartId,
  });

  const filteredInternalMessages = React.useMemo(() => {
    if (search === "") return internalState;

    const normalizedSearchTerm = normalizeSearch(search.toLowerCase());

    return internalState.filter((msg) => {
      const fromFullName = `${msg?.from?.firstName} ${msg?.from?.lastName}`;
      const toFullName = `${msg?.to?.firstName} ${msg?.to?.lastName}`;

      return (
        normalizeSearch(fromFullName)?.includes(normalizedSearchTerm) ||
        normalizeSearch(toFullName)?.includes(normalizedSearchTerm)
      );
    });
  }, [search, internalState]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    runSearch(value); // Debounced client-message search
  };

  const hasMessages =
    clientMessages.length > 0 || filteredInternalMessages.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-2">
      {/* Redesigned Search Input Field */}
      <div className="relative flex items-center m-1 mb-4 flex-shrink-0">
        <SearchIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400 dark:text-slate-300 transition-colors duration-300" />
        <input
          type="text"
          aria-label="Search"
          placeholder="Search messages by Name"
          className="w-full border border-slate-300 ring-0 rounded-xl bg-transparent pr-3 pl-10 py-2 text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[0_8px_24px_rgba(101,113,255,0.08)] transition-all duration-300"
          // onChange={(e) => {
          //   setSearch(e.target.value);
          // }}
          onChange={handleSearchChange}
          value={search}
        />
      </div>

      {/* Message List Container - Filling remaining height and scrolling */}
      <div
        id="scrollableDiv"
        className="custom-scrollbar flex flex-1 flex-col space-y-3 overflow-y-auto w-full self-center pr-1 m-1"
      >
        <InfiniteScroll
          dataLength={clientMessages.length + filteredInternalMessages.length}
          next={fetchMoreClients}
          hasMore={!search && hasMore}
          loader={
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          }
          scrollableTarget="scrollableDiv"
          className="space-y-3"
          endMessage={
            hasMessages && !hasMore ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
                {user?.employeeType === "Sales" &&
                !clientMessages.some(
                  (data) => data.MailgunEmail && data.MailgunEmail.length > 0,
                ) ? (
                  <b>No New Messages From Client</b>
                ) : (
                  <b>All messages loaded</b>
                )}
              </p>
            ) : null
          }
        >
          {/* 1. Client Messages (Sales focus) */}
          {clientMessages.map((data) => {
            if (data.MailgunEmail?.length === 0) return null;

            // Get the latest email
            const latestEmail = data.MailgunEmail[data.MailgunEmail.length - 1];

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
                redirectUrl={`/dashboard/communication/client/${data.id}?chat=true`}
                communicationType="Client"
                photoUrl={data.photo}
                isSeen={data.isSeen}
              />
            );
          })}

          {/* 2. Internal Messages (Technician focus) */}
          {filteredInternalMessages?.map((data: TInternalMessage) => {
            const targetUser =
              user?.id === data?.from?.id ? data?.to : data?.from;
            const userName = `${targetUser?.firstName || ""} ${targetUser?.lastName || ""}`;

            const messageBy = data?.from?.id === user?.id ? "You: " : "";

            const formattedMessage = formatInternalAttachmentMessage(
              data.message,
              data.attachment,
            );

            return (
              <Message
                key={data.id}
                userName={userName}
                message={`${messageBy}${formattedMessage}`}
                redirectUrl={`/dashboard/communication/internal/?id=${targetUser?.id}`}
                communicationType="Internal"
                photoUrl={targetUser?.image} // Use the target user's image
                isSeen={data.isSeen}
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
        </InfiniteScroll>
      </div>
    </div>
  );
}
