"use client";

import { RefObject, useEffect, useRef } from "react";

const SETTLE_MS = 700;

type TClient = { id: number };

type TParams<T extends TClient> = {
  selectedId: number | null;
  clients: T[];
  containerRef: RefObject<HTMLElement | null>;
};

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
