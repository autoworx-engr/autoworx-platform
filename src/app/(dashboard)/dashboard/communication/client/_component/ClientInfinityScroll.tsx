"use client";

import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { Client, ClientConversationTrack } from "@prisma/client";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { getClientByScroll } from "../_actions/getClientByScroll";
import { getClients } from "../_actions/getClients";
import { clientSortByUpdatedMessage } from "../_utils";
import ClientItem from "./ClientItem";
import { useClientCommunicationStore } from "@/stores/client-store";
import { isIosPwa } from "@/utils/isIosPwa";

type TClient = Client & {
  conversationsTrack?: ClientConversationTrack | null;
};

type TProps = {
  clients?: TClient[];
  defaultTakeData?: number;
  companyId: number;
};

export default function ClientInfinityScroll({
  clients: initialsClients = [],
  defaultTakeData = 20,
  companyId,
}: TProps) {
  // Initial clients should already be properly sorted from the server
  const [clients, setClients] = useState<TClient[]>(initialsClients);
  const { filter, searchTerm } = useDemoClientFilterStore();
  const normalizedSearch = searchTerm?.trim();
  const resetClientData = useClientCommunicationStore(
    (state) => state.resetClientData,
  );
  const [hasMore, setHasMore] = useState(true);
  const params = useParams();

  const clientIdParams = params?.id;
  const dataLength = clients.length;
  const router = useRouter();

  const pathname = usePathname();
  let isClientInitialPage = pathname === "/dashboard/communication/client";

  // subscribe to pusher channel for realtime updates
  useEffect(() => {
    pusher
      .subscribe(`client-notify-${companyId}`)
      .bind("client-notify", (data: ClientConversationTrack) => {
        if (!data) return;

        setClients((prevClients) => {
          // Ensure no duplicates by using a Map with client ID as key
          const clientMap = new Map();
          prevClients.forEach((client) => {
            clientMap.set(client.id, client);
          });

          // Update the specific client's conversation track
          if (clientMap.has(data.clientId)) {
            const existingClient = clientMap.get(data.clientId);
            clientMap.set(data.clientId, {
              ...existingClient,
              conversationsTrack: data,
            });
          }

          // Convert back to array and sort
          const updatedClients = Array.from(clientMap.values());
          const sortedClients = clientSortByUpdatedMessage(updatedClients);
          return sortedClients;
        });

        if (clientIdParams === data.clientId.toString()) {
          useClientCommunicationStore.setState({
            clientConversationTrack: data,
          });
        }
      });
    return () => {
      pusher.unbind("client-notify").unsubscribe(`client-notify-${companyId}`);
    };
  }, [companyId, clientIdParams]);

  useEffect(() => {
    // Only refetch when user is actively filtering/searching
    // For 'All' filter with no search, rely on initial clients + infinite scroll
    if (normalizedSearch || (filter && filter !== "All")) {
      const fetchFilteredClients = async () => {
        try {
          const fetchedClients = await getClients({
            companyId: companyId,
            // pass trimmed search so server-side doesn't receive whitespace-only strings
            search: normalizedSearch,
            filter,
          });

          setClients(fetchedClients);
          setHasMore(false); // Disable infinite scroll for search/filter results
        } catch (err) {
          console.error(
            "📋 ClientInfinityScroll: Error fetching clients:",
            err,
          );
          errorToast("Failed to fetch clients");
        }
      };
      fetchFilteredClients();
    } else if (filter === "All" && !searchTerm) {
      console.log("📋 ClientInfinityScroll: Resetting to initial clients:", {
        initialCount: initialsClients.length,
      });

      // For 'All' filter with no search, use initial clients and enable infinite scroll
      setClients(initialsClients);
      setHasMore(initialsClients.length >= defaultTakeData); // Re-enable infinite scroll if we have enough initial data
    }
  }, [filter, searchTerm, companyId, initialsClients, defaultTakeData]);

  // const [page, setPage] = useState(1);
  useEffect(() => {
    if (isClientInitialPage) {
      //192.168.1.5:3000

      // if (clients && clients.length === 0) router.push("/404");
      const isPwa = isIosPwa();
      if (isPwa && clients && clients.length > 0) {
        router.push("/dashboard/communication/client");
        setHasMore(true);
      } else if (clients && clients.length > 0) {
        router.push(`/dashboard/communication/client/${clients[0]?.id}`);
        useClientCommunicationStore.setState({
          clientConversationTrack: clients[0]?.conversationsTrack,
        });
        setHasMore(true);
      } else {
        router.push("/dashboard/communication/client");
        setHasMore(false);
      }
    }
  }, [clients, isClientInitialPage]);

  useEffect(() => {
    return () => {
      resetClientData();
    };
  }, [resetClientData]);

  const fetchData = async () => {
    try {
      const fetchClients = await getClientByScroll({
        skip: clients.length,
        take: defaultTakeData,
      });

      if (fetchClients.length < defaultTakeData) {
        setHasMore(false);
      }

      // Prevent duplicate clients when fetching more data
      // Note: getClientByScroll already returns sorted data
      setClients((prev) => {
        const existingIds = new Set(prev.map((client) => client.id));
        const newClients = fetchClients.filter(
          (client) => !existingIds.has(client.id),
        );
        return [...prev, ...newClients];
      });
    } catch (err) {
      console.error("📋 ClientInfinityScroll fetchData: Error:", err);
      setHasMore(false);
      errorToast("Failed to fetch clients");
    }
  };

  return (
    <div
      id="scrollableDiv"
      // className="thin-scrollbar mt-2 flex h-[84%] flex-col gap-2 p-2 max-[1835px]:h-[82%] lg:overflow-y-auto"
      className="thin-scrollbar mt-2 h-[82%] overflow-y-auto p-2"
    >
      <InfiniteScroll
        dataLength={dataLength} //This is important field to render the next data
        next={fetchData}
        hasMore={filter === "All" && !searchTerm && hasMore}
        loader={
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
            <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
          </div>
        }
        scrollableTarget="scrollableDiv"
        endMessage={
          <p className="mb-5 text-center">
            {clients.length === 0 ? (
              <b>Client Not Found</b>
            ) : (
              <b>Yay! You have seen it all</b>
            )}
          </p>
        }
      >
        {clients?.map((client: Client) => {
          const selected = parseInt(clientIdParams as string) === client.id;
          return (
            <ClientItem
              key={client.id}
              client={client}
              selected={selected}
              setClients={setClients}
            />
          );
        })}
      </InfiniteScroll>
    </div>
  );
}
