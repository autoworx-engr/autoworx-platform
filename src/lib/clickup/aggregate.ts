import type { BreakdownSlice, LeaderboardEntry } from "@/types/clickup";

export const PRIORITY_ORDER = ["urgent", "high", "normal", "low"];

export function bumpLeaderboard(
  map: Map<number, LeaderboardEntry>,
  userId: number,
  name: string,
  color: string | null,
) {
  const existing = map.get(userId);
  if (existing) {
    existing.count += 1;
  } else {
    map.set(userId, {
      userId,
      name: name || `User ${userId}`,
      color,
      count: 1,
    });
  }
}

/** Every contributor, ranked — leaderboards intentionally show everyone, not a top-N cut. */
export function topEntries(map: Map<number, LeaderboardEntry>) {
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function bumpBreakdown(
  map: Map<string, BreakdownSlice>,
  key: string,
  label: string,
) {
  const existing = map.get(key);
  if (existing) existing.count += 1;
  else map.set(key, { key, label, count: 1 });
}

export function foldBreakdown(
  map: Map<string, BreakdownSlice>,
  cap: number,
): BreakdownSlice[] {
  const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
  if (sorted.length <= cap) return sorted;
  const head = sorted.slice(0, cap);
  const otherCount = sorted.slice(cap).reduce((sum, s) => sum + s.count, 0);
  return [...head, { key: "other", label: "Other", count: otherCount }];
}

export function orderedPriorityBreakdown(
  map: Map<string, BreakdownSlice>,
): BreakdownSlice[] {
  return PRIORITY_ORDER.map((key) => map.get(key))
    .filter((slice): slice is BreakdownSlice => Boolean(slice))
    .concat(map.get("none") ? [map.get("none")!] : []);
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
