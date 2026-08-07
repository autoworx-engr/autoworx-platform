"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useTransition,
  useCallback,
} from "react";
import { Client, MailgunEmail, User } from "@prisma/client";
import { FullMessage } from "@/actions/dashboard/technician/recentMessages";
import { Message } from "./Message"; // Assuming Message component is styled separately
import { formatInternalAttachmentMessage } from "@/utils/formatAttachmentMessage";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { cn } from "@/lib/cn"; // Utility for merging Tailwind classes
import { Search as SearchIcon, Loader2 } from "lucide-react"; // Import for premium input
import { getClientMessages } from "@/actions/message/getClientMessages";
import { useDebounce } from "@/hooks/useDebounce";
import InfiniteScroll from "react-infinite-scroll-component";

type TMessageContainerProps = {
  // clientMessages?: (Client & {
  //   MailgunEmail: (MailgunEmail & { client: Client })[];
  // })[];
  initialClientMessages?: (Client & {
    MailgunEmail: (MailgunEmail & { client: Client })[];
  })[];
  internalMessages?: FullMessage[];
  user: User;
  canSeeClientMessages?: boolean;
};

export default function MessageContainer({
  // clientMessages = [],
  initialClientMessages = [],
  internalMessages = [],
  user,
  canSeeClientMessages = false,
}: TMessageContainerProps) {
  const [search, setSearch] = useState("");
  const [clientMessages, setClientMessages] = useState(initialClientMessages);
  const [hasMore, setHasMore] = useState(initialClientMessages.length >= 20);
  const [isPending, startTransition] = useTransition();

  const filteredInternalMessages = React.useMemo(() => {
    if (search === "") return internalMessages;

    const normalizedSearchTerm = normalizeSearch(search.toLowerCase());

    return internalMessages.filter((msg) => {
      const fromFullName = `${msg?.from?.firstName} ${msg?.from?.lastName}`;
      const toFullName = `${msg?.to?.firstName} ${msg?.to?.lastName}`;

      return (
        normalizeSearch(fromFullName)?.includes(normalizedSearchTerm) ||
        normalizeSearch(toFullName)?.includes(normalizedSearchTerm)
      );
    });
  }, [search, internalMessages]);

  // Debounced search function
  const debouncedSearch = useDebounce((searchTerm: string) => {
    if (!canSeeClientMessages) return; // internal list filters locally
    if (searchTerm.trim()) {
      startTransition(async () => {
        try {
          const data = await getClientMessages(1, searchTerm.trim());
          setClientMessages(data.messages);
          setHasMore(false);
        } catch (error) {
          console.error("Error searching messages:", error);
        }
      });
    } else {
      // Reset to initial when search is cleared
      setClientMessages(initialClientMessages);
      setHasMore(initialClientMessages.length >= 20);
    }
  }, 500);

  // Fetch more client messages
  const fetchMoreClients = useCallback(async () => {
    if (!canSeeClientMessages || isPending || search || !hasMore) return;

    startTransition(async () => {
      try {
        const data = await getClientMessages(
          Math.floor(clientMessages.length / 20) + 1,
          "",
        );

        setClientMessages((prev) => {
          const existingIds = new Set(prev.map((client) => client.id));
          const newClients = data.messages.filter(
            (client) => !existingIds.has(client.id),
          );
          return [...prev, ...newClients];
        });

        setHasMore(data.hasMore);
      } catch (error) {
        console.error("Error loading more messages:", error);
        setHasMore(false);
      }
    });
  }, [canSeeClientMessages, clientMessages.length, isPending, search, hasMore]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value); // Call debounced function
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
                <b>All messages loaded</b>
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
        </InfiniteScroll>
      </div>
    </div>
  );
}
