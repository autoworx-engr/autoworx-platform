"use client";

import { useEffect, useRef } from "react";

const MAX_AUTO_FETCH_ATTEMPTS = 25;

type TClient = { id: number };

type TParams<T extends TClient> = {
  selectedId: number | null;
  clients: T[];
  hasMore: boolean;
  isDefaultView: boolean;
  fetchNextPage: () => Promise<void>;
};

/**
 * The selected client (opened via a pipeline card or notification) may be
 * further down the list than what's been paged in so far. Keeps requesting
 * further pages until its row is loaded, so the list's scroll-into-view
 * effect has something to scroll to. Gives up after MAX_AUTO_FETCH_ATTEMPTS
 * so a deleted/inaccessible client id can't trigger unbounded fetching.
 */
export function useAutoLoadSelectedClient<T extends TClient>({
  selectedId,
  clients,
  hasMore,
  isDefaultView,
  fetchNextPage,
}: TParams<T>) {
  const attempts = useRef(0);

  useEffect(() => {
    attempts.current = 0;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId == null) return;
    if (!isDefaultView || !hasMore) return;
    if (clients.some((client) => client.id === selectedId)) return;
    if (attempts.current >= MAX_AUTO_FETCH_ATTEMPTS) return;

    attempts.current += 1;
    fetchNextPage();
  }, [selectedId, clients, hasMore, isDefaultView, fetchNextPage]);
}
