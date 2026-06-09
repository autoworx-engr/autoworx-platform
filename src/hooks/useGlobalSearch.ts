import { useMemo, useState } from "react";
import {
  generatedRegistry,
  type SearchItem,
} from "@/lib/search-registry.generated";

const MAX_RESULTS = 20;

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();

  if (!q) return 0;

  const label = item.label.toLowerCase();
  const description = item.description?.toLowerCase() ?? "";

  let score = 0;

  // Exact label match
  if (label === q) score += 100;

  // Label starts with query
  if (label.startsWith(q)) score += 75;

  // Label contains query
  if (label.includes(q)) score += 50;

  // Keyword matches
  for (const keyword of item.keywords) {
    const k = keyword.toLowerCase();

    if (k === q) score += 40;
    else if (k.startsWith(q)) score += 30;
    else if (k.includes(q)) score += 20;
  }

  // Description match
  if (description.includes(q)) score += 10;

  return score;
}

export function useSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();

    if (!q) {
      return generatedRegistry.slice(0, MAX_RESULTS);
    }

    return generatedRegistry
      .map((item) => ({
        item,
        score: scoreItem(item, q),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((result) => result.item);
  }, [query]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
    isSearching: query.trim().length > 0,
  };
}
