"use client";

import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { Client, ClientConversationTrack } from "@prisma/client";
import { Users } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { getClients } from "../_actions/getClients";
import { clientSortByUpdatedMessage } from "../_utils";
import ClientItem from "./ClientItem";
import { useClientCommunicationStore } from "@/stores/client-store";
import { isIosPwa } from "@/utils/isIosPwa";
import { useAutoLoadSelectedClient } from "../../_hooks/useAutoLoadSelectedClient";
import { useClientPageFetcher } from "../_hooks/useClientPageFetcher";

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
  // The very first render already has the correct data from the server
  // (initialsClients) — skip the redundant refetch that would otherwise
  // fire on mount for the default "All"/no-search view.
  const isFirstRun = useRef(true);
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
    if (isFirstRun.current && filter === "All" && !normalizedSearch) {
      // Skip the redundant refetch on mount — initialsClients already has
      // the correct data for the default view.
      isFirstRun.current = false;
      return;
    }
    isFirstRun.current = false;

    // Always hit the server for the current filter/search state, "All" with
    // no search included. Restoring from any in-memory snapshot (the initial
    // SSR prop, or a client-captured one) can drift from what the server
    // would return right now — e.g. once real-time activity reorders things
    // — and only a fresh reload was reflecting the correct order. Refetching
    // here makes "clear search" match a reload exactly, every time.
    const fetchCurrentView = async () => {
      try {
        const fetchedClients = await getClients({
          companyId,
          // pass trimmed search so server-side doesn't receive whitespace-only strings
          search: normalizedSearch,
          filter,
          take: defaultTakeData,
        });

        setClients(fetchedClients);
        // Infinite scroll only applies to the plain "All" view with no
        // search — filtered/searched result sets are already complete.
        const isDefaultView = filter === "All" && !normalizedSearch;
        setHasMore(isDefaultView && fetchedClients.length >= defaultTakeData);
      } catch (err) {
        console.error("📋 ClientInfinityScroll: Error fetching clients:", err);
        errorToast("Failed to fetch clients");
      }
    };
    fetchCurrentView();
  }, [filter, searchTerm, normalizedSearch, companyId, defaultTakeData]);

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

  const fetchData = useClientPageFetcher({
    clients,
    setClients,
    setHasMore,
    defaultTakeData,
  });

  const isDefaultView = filter === "All" && !normalizedSearch;
  useAutoLoadSelectedClient({
    selectedId: clientIdParams ? parseInt(clientIdParams as string) : null,
    clients,
    hasMore,
    isDefaultView,
    fetchNextPage: fetchData,
  });

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
          clients.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Users className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-slate-700">No Clients Found</p>
                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm
                    ? `No clients match "${searchTerm}".`
                    : filter === "All"
                      ? "You don't have any clients yet."
                      : `You don't have any ${
                          filter === "Assigned"
                            ? "clients assigned to you"
                            : `${filter.toLowerCase()} clients`
                        }.`}
                </p>
              </div>
            </div>
          ) : (
            <p className="mb-5 text-center">
              <b>Yay! You have seen it all</b>
            </p>
          )
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
