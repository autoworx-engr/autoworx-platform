import { getClientMessages } from "@/actions/message/getClientMessages";
import { useDebounce } from "@/hooks/useDebounce";
import { useCallback, useState, useTransition } from "react";
import { TClientMessage } from "./recentMessageTypes";

const PAGE_SIZE = 20;

type Args = {
  initialClientMessages: TClientMessage[];
  canSeeClientMessages: boolean;
  search: string;
};

/**
 * Owns the client half of the recent-messages list: the debounced server
 * search and the infinite-scroll paging. Split out of MessageContainer to
 * keep that component within the file-size limit.
 */
export function useClientMessagesList({
  initialClientMessages,
  canSeeClientMessages,
  search,
}: Args) {
  const [clientMessages, setClientMessages] = useState(initialClientMessages);
  const [hasMore, setHasMore] = useState(
    initialClientMessages.length >= PAGE_SIZE,
  );
  const [isPending, startTransition] = useTransition();

  const runSearch = useDebounce((searchTerm: string) => {
    if (!canSeeClientMessages) return; // internal list filters locally
    if (!searchTerm.trim()) {
      setClientMessages(initialClientMessages);
      setHasMore(initialClientMessages.length >= PAGE_SIZE);
      return;
    }

    startTransition(async () => {
      try {
        const data = await getClientMessages(1, searchTerm.trim());
        setClientMessages(data.messages);
        setHasMore(false);
      } catch (error) {
        console.error("Error searching messages:", error);
      }
    });
  }, 500);

  const fetchMoreClients = useCallback(async () => {
    if (!canSeeClientMessages || isPending || search || !hasMore) return;

    startTransition(async () => {
      try {
        const data = await getClientMessages(
          Math.floor(clientMessages.length / PAGE_SIZE) + 1,
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

  return {
    clientMessages,
    setClientMessages,
    hasMore,
    fetchMoreClients,
    runSearch,
  };
}
