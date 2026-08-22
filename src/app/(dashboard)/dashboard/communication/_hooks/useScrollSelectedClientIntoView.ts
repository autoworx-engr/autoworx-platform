"use client";

import { RefObject, useEffect, useRef } from "react";

/**
 * Rows keep growing for a moment after they mount — avatars load, message
 * previews wrap — which pushes the target row away from wherever a single
 * scroll call put it. Realigning across a short window rides that out.
 */
const SETTLE_MS = 700;

type TClient = { id: number };

type TParams<T extends TClient> = {
  selectedId: number | null;
  clients: T[];
  /** Scroll container holding the rows. */
  containerRef: RefObject<HTMLElement | null>;
};

/**
 * Scrolls the selected client's row into view in the list.
 *
 * Arriving from a pipeline card, a lead or a notification opens the client on
 * the right while the list on the left stays wherever it was, so the active row
 * can sit off screen. Positions the container directly from the row's offset
 * rather than `scrollIntoView`, which would also move the page around the list.
 *
 * Stops early if the user scrolls, and only runs once per selected client, so
 * it never fights someone browsing the list.
 */
export function useScrollSelectedClientIntoView<T extends TClient>({
  selectedId,
  clients,
  containerRef,
}: TParams<T>) {
  const alignedFor = useRef<number | null>(null);
  const isRowLoaded = clients.some((client) => client.id === selectedId);

  useEffect(() => {
    if (selectedId == null || !isRowLoaded) return;
    if (alignedFor.current === selectedId) return;

    const container = containerRef.current;
    if (!container) return;

    alignedFor.current = selectedId;

    let frame = 0;
    let elapsed = 0;
    let stopped = false;

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      container.removeEventListener("wheel", stop);
      container.removeEventListener("touchstart", stop);
    };

    const align = () => {
      if (stopped) return;

      const row = container.querySelector<HTMLElement>(
        `[data-client-row="${selectedId}"]`,
      );
      if (row) {
        // Centred when there's room, clamped to the ends of the list.
        const target = Math.max(
          0,
          Math.min(
            row.offsetTop - (container.clientHeight - row.offsetHeight) / 2,
            container.scrollHeight - container.clientHeight,
          ),
        );
        if (Math.abs(container.scrollTop - target) > 2) {
          container.scrollTop = target;
        }
      }

      elapsed += 16;
      if (elapsed < SETTLE_MS) frame = requestAnimationFrame(align);
    };

    container.addEventListener("wheel", stop, { passive: true });
    container.addEventListener("touchstart", stop, { passive: true });
    frame = requestAnimationFrame(align);

    return stop;
  }, [selectedId, isRowLoaded, containerRef]);
}
