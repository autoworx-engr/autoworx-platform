"use client";

import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useDemoClientFilterStore } from "@/stores/clientFilter";
import { Client, ClientConversationTrack } from "@prisma/client";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { getClientByScroll } from "../_actions/getClientByScroll";
import { getClients } from "../_actions/getClients";
import { clientSortByUpdatedMessage } from "../_utils";
import ClientItem from "./ClientItem";
import {
  clientListStore,
  useClientCommunicationStore,
} from "@/stores/client-store";

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
  const { clientList, setClientList } = clientListStore();
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
          const updatedClient = prevClients.map((client) => {
            if (client.id == data.clientId) {
              return {
                ...client,
                conversationsTrack: data,
              };
            }
            return client;
          });
          const sortedClient = clientSortByUpdatedMessage(updatedClient);
          return sortedClient;
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
  }, [pathname]);

  useEffect(() => {
    const fetchFilteredClients = async () => {
      try {
        const clients = await getClients({
          companyId: companyId,
          search: searchTerm,
          filter,
        });
        setClients(clients);
      } catch (err) {
        errorToast("Failed to fetch clients");
      }
    };
    fetchFilteredClients();
  }, [filter, searchTerm]);

  // const [page, setPage] = useState(1);
  useEffect(() => {
    if (isClientInitialPage) {
      // if (clients && clients.length === 0) router.push("/404");
      if (clients && clients.length > 0) {
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
    return () => {
      resetClientData();
    };
  }, [clients, isClientInitialPage]);

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  const fetchData = async () => {
    try {
      const fetchClients = await getClientByScroll({
        skip: dataLength,
        take: defaultTakeData,
      });

      if (fetchClients.length < defaultTakeData) {
        setHasMore(false);
      }
      setClients((prev) => [...prev, ...fetchClients]);
    } catch (err) {
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
        hasMore={filter === "All" && hasMore}
        loader={
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-dashed border-yellow-500"></div>
            <h2 className="mt-4 text-zinc-900 dark:text-white">Loading...</h2>
          </div>
        }
        scrollableTarget="scrollableDiv"
        endMessage={
          <p className="mb-5 text-center">
            {clientList.length === 0 ? (
              <b>Client Not Found</b>
            ) : (
              <b>Yay! You have seen it all</b>
            )}
          </p>
        }
      >
        {clientList?.map((client: Client) => {
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
