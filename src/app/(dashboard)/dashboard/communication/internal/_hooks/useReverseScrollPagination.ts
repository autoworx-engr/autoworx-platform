"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";

/**
 * Reverse-pagination scroll glue — powers UserMessageBox and GroupMessageBox.
 *
 * Behavior:
 *  - When the user scrolls near the top (scrollTop ≤ 80px), `fetchNextPage()`
 *    is called to prepend an older page.
 *  - The current `scrollHeight` is captured in a ref BEFORE the fetch so that
 *    after the new page lands `adjustAfterPagesChange` can bump `scrollTop` by
 *    the height delta, keeping the visual position stable (no jump).
 *  - We deliberately use a `useRef` (not `useState`) for `prevScrollHeight` so
 *    that capturing the height does NOT cause a re-render and does NOT change
 *    the identity of `adjustAfterPagesChange`. Using `useState` was the root
 *    cause of a bug where the `useEffect` in the parent fired prematurely
 *    (because `adjustAfterPagesChange` identity changed), reset `prevScrollHeight`
 *    to 0, and the real adjustment never ran.
 *
 * Callers should invoke `adjustAfterPagesChange(pagesLen)` inside a
 * `useLayoutEffect` keyed on `data?.pages?.length`. Running it in
 * `useLayoutEffect` (synchronous, before paint) means the scroll correction
 * is invisible to the user — no flash of the wrong position.
 */
export function useReverseScrollPagination({
  containerRef,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isReady,
}: {
  containerRef: RefObject<HTMLElement | null>;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | unknown;
  isFetchingNextPage: boolean;
  isReady: boolean;
}) {
  // Ref so reading/writing never triggers a re-render or changes callback
  // identities. This was the core of the previous scroll-to-bottom bug.
  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);

  const maybeLoadOlder = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (
      !isReady ||
      el.scrollTop > 80 ||
      !hasNextPage ||
      isFetchingNextPage ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    isLoadingOlderRef.current = true;
    // Capture height BEFORE the new page lands so we know how much to adjust.
    prevScrollHeightRef.current = el.scrollHeight;

    Promise.resolve(fetchNextPage()).finally(() => {
      isLoadingOlderRef.current = false;
    });
  }, [containerRef, fetchNextPage, hasNextPage, isFetchingNextPage, isReady]);

  /**
   * Call this inside a `useLayoutEffect` keyed on `data?.pages?.length`.
   * It restores scroll position after older messages are prepended so the
   * user sees the same content they were looking at before the page landed.
   *
   * Because `prevScrollHeightRef` is a ref (not state), this callback has a
   * **stable identity** — it will never spuriously re-trigger the caller's
   * effect. The effect only fires when `pages.length` actually changes.
   */
  const adjustAfterPagesChange = useCallback(
    (_pagesLen: number) => {
      if (prevScrollHeightRef.current <= 0) return;
      const container = containerRef.current;
      if (!container) {
        prevScrollHeightRef.current = 0;
        return;
      }

      const scrollDiff = container.scrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        // Apply synchronously — the caller runs this inside useLayoutEffect
        // (before paint) so there is no visible jump.
        container.scrollTop = container.scrollTop + scrollDiff;
      }
      prevScrollHeightRef.current = 0;
    },
    // containerRef is stable; prevScrollHeightRef is a ref — neither causes
    // identity changes on this callback.
    [containerRef],
  );

  // Wire the scroll listener. Re-registers only when `maybeLoadOlder` changes
  // (i.e. when hasNextPage / isFetchingNextPage / isReady change).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", maybeLoadOlder, { passive: true });
    return () => el.removeEventListener("scroll", maybeLoadOlder);
  }, [containerRef, maybeLoadOlder]);

  return { adjustAfterPagesChange };
}
