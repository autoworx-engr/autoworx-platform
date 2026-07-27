import { useMemo, useState } from "react";
import {
  generatedRegistry,
  type SearchItem,
} from "@/lib/search-registry.generated";
import { canAccessRoute } from "@/lib/routeAccess";
import { useGetPermissions } from "@/hooks/permissions/useGetPermissions";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";

const MAX_RESULTS = 20;

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();

  if (!q) return 0;

  const label = item.label.toLowerCase();
  const description = item.description?.toLowerCase() ?? "";

  let score = 0;

  if (label === q) score += 100;

  if (label.startsWith(q)) score += 75;

  if (label.includes(q)) score += 50;

  for (const keyword of item.keywords || []) {
    const k = keyword.toLowerCase();

    if (k === q) score += 40;
    else if (k.startsWith(q)) score += 30;
    else if (k.includes(q)) score += 20;
  }

  if (description.includes(q)) score += 10;

  return score;
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const user = useGetCurrentUser();
  const { data: permissions } = useGetPermissions(
    user?.companyId,
    user?.id ? Number(user.id) : undefined,
  );

  // Company permission takes priority, and both the company AND the user
  // must be allowed (mirrors the real route-access check) - so an item only
  // shows here if navigating to it wouldn't be blocked either.
  const accessibleRegistry = useMemo(
    () =>
      generatedRegistry.filter((item) =>
        canAccessRoute(item.href, permissions ?? null),
      ),
    [permissions],
  );

  const results = useMemo(() => {
    const q = query.trim();

    if (!q) {
      return accessibleRegistry.slice(0, MAX_RESULTS);
    }

    return accessibleRegistry
      .map((item) => ({
        item,
        score: scoreItem(item, q),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((result) => result.item);
  }, [query, accessibleRegistry]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
    isSearching: query.trim().length > 0,
  };
}
