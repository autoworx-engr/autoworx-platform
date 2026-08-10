import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

type AnyRow = { id?: number | null } & Record<string, unknown>;

/**
 * Shared cache-mutation primitive used by both `UserMessageBox` and
 * `GroupMessageBox`. Prepends a row to page-0 of an infinite-query cache
 * (which is stored newest-first), and de-dupes by row id.
 *
 * Returns a stable `prependToFirstPage(row)` callback. Callers supply the
 * exact query-key and the shape of the row to insert.
 */
export function usePrependToInfiniteCache<TRow extends AnyRow>(
  queryKey: readonly unknown[],
) {
  const queryClient = useQueryClient();

  return useCallback(
    (row: TRow) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages?.length) return old;
        const [firstPage, ...rest] = old.pages;
        if (row.id && firstPage.data.some((m: AnyRow) => m.id === row.id)) {
          return old;
        }
        return {
          ...old,
          pages: [{ ...firstPage, data: [row, ...firstPage.data] }, ...rest],
        };
      });
    },
    // queryKey is a tuple; depend on its serialized identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, JSON.stringify(queryKey)],
  );
}
