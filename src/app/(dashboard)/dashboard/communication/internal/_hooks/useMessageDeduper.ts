import { useRef } from "react";

/**
 * Bounded set used to suppress duplicate Pusher deliveries. Caller mints a
 * stable key per event; we drop the oldest half when we hit `maxSize` so the
 * set can never grow without bound.
 */
export function useMessageDeduper(maxSize = 100) {
  const seen = useRef(new Set<string>());

  const shouldProcess = (key: string) => {
    if (seen.current.has(key)) return false;
    seen.current.add(key);
    if (seen.current.size > maxSize) {
      const keys = Array.from(seen.current);
      keys
        .slice(0, Math.floor(maxSize / 2))
        .forEach((k) => seen.current.delete(k));
    }
    return true;
  };

  return { shouldProcess };
}
