"use client";

import type { Dispatch, SetStateAction } from "react";
import { errorToast } from "@/lib/toast";
import type { Client, ClientConversationTrack } from "@prisma/client";
import { getClientByScroll } from "../_actions/getClientByScroll";

type TClient = Client & {
  conversationsTrack?: ClientConversationTrack | null;
};

type TParams = {
  clients: TClient[];
  setClients: Dispatch<SetStateAction<TClient[]>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  defaultTakeData: number;
};

// Extracted from ClientInfinityScroll as-is (no behavior change) to keep
// that file under the repo's line-count limit.
export function useClientPageFetcher({
  clients,
  setClients,
  setHasMore,
  defaultTakeData,
}: TParams) {
  return async function fetchData() {
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
}
