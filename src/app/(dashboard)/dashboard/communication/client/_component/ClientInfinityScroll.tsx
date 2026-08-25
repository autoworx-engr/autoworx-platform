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
import {
  clientListStore,
  useClientCommunicationStore,
} from "@/stores/client-store";
import { isIosPwa } from "@/utils/isIosPwa";
import { useAutoLoadSelectedClient } from "../../_hooks/useAutoLoadSelectedClient";
import { useScrollSelectedClientIntoView } from "../../_hooks/useScrollSelectedClientIntoView";
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
  const [clients, setClients] = useState<TClient[]>(initialsClients);
  const { filter, searchTerm } = useDemoClientFilterStore();
  const normalizedSearch = searchTerm?.trim();
  const resetClientData = useClientCommunicationStore(
    (state) => state.resetClientData,
  );
  const [hasMore, setHasMore] = useState(true);
  const isFirstRun = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const params = useParams();

  const clientIdParams = params?.id;
  const dataLength = clients.length;
  const router = useRouter();

  const pathname = usePathname();
  let isClientInitialPage = pathname === "/dashboard/communication/client";

  const bumpedClient = clientListStore((state) => state.bumpedClient);
  useEffect(() => {
    if (!bumpedClient) return;
    setClients((prevClients) => {
      const index = prevClients.findIndex(
        (client) => client.id === bumpedClient.clientId,
      );
      if (index <= 0) return prevClients;
      const next = [...prevClients];
      const [moved] = next.splice(index, 1);
      return [moved, ...next];
    });
  }, [bumpedClient]);

  useEffect(() => {
    const channel = pusher.subscribe(`client-notify-${companyId}`);
    const handleClientNotify = (data: ClientConversationTrack) => {
      if (!data) return;

      setClients((prevClients) => {
        const clientMap = new Map();
        prevClients.forEach((client) => {
          clientMap.set(client.id, client);
        });

        if (clientMap.has(data.clientId)) {
          const existingClient = clientMap.get(data.clientId);
          clientMap.set(data.clientId, {
            ...existingClient,
            conversationsTrack: data,
          });
        }

        const updatedClients = Array.from(clientMap.values());
        return clientSortByUpdatedMessage(updatedClients);
      });

      if (clientIdParams === data.clientId.toString()) {
        useClientCommunicationStore.setState({
          clientConversationTrack: data,
        });
      }
    };

    channel.bind("client-notify", handleClientNotify);
    return () => {
      channel.unbind("client-notify", handleClientNotify);
    };
  }, [companyId, clientIdParams]);

  useEffect(() => {
    if (isFirstRun.current && filter === "All" && !normalizedSearch) {
      isFirstRun.current = false;
      return;
    }
    isFirstRun.current = false;

    const fetchCurrentView = async () => {
      try {
        const fetchedClients = await getClients({
          companyId,
          search: normalizedSearch,
          filter,
          take: defaultTakeData,
        });

        setClients(fetchedClients);
        const isDefaultView = filter === "All" && !normalizedSearch;
        setHasMore(isDefaultView && fetchedClients.length >= defaultTakeData);
      } catch (err) {
        console.error("📋 ClientInfinityScroll: Error fetching clients:", err);
        errorToast("Failed to fetch clients");
      }
    };
    fetchCurrentView();
  }, [filter, searchTerm, normalizedSearch, companyId, defaultTakeData]);

  useEffect(() => {
    if (isClientInitialPage) {
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
  const selectedClientId = clientIdParams
    ? parseInt(clientIdParams as string)
    : null;
  useAutoLoadSelectedClient({
    selectedId: selectedClientId,
    clients,
    hasMore,
    isDefaultView,
    fetchNextPage: fetchData,
  });
  useScrollSelectedClientIntoView({
    selectedId: selectedClientId,
    clients,
    containerRef: listRef,
  });

  return (
    <div
      id="scrollableDiv"
      ref={listRef}
      className="mt-2 h-[82%] overflow-y-auto p-2"
    >
      <InfiniteScroll
        dataLength={dataLength}
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
