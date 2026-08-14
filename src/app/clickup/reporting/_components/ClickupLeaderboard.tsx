"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { initials } from "@/lib/clickup/format";
import type { LeaderboardEntry } from "@/types/clickup";

type SortKey = "count" | "name";
type SortDir = "asc" | "desc";

function SortButton({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground ${
        align === "right" ? "ml-auto flex-row-reverse" : ""
      }`}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

export default function ClickupLeaderboard({
  title,
  countLabel,
  entries,
  accentColor,
}: {
  title: string;
  countLabel: string;
  entries: LeaderboardEntry[];
  accentColor: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const cmp =
        sortKey === "count" ? a.count - b.count : a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sortKey, sortDir]);

  const max = Math.max(...entries.map((e) => e.count), 1);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="text-base font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No data for this range.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between border-b border-border/60 pb-2">
            <SortButton
              label="Teammate"
              active={sortKey === "name"}
              dir={sortDir}
              onClick={() => toggleSort("name")}
            />
            <SortButton
              label={countLabel}
              active={sortKey === "count"}
              dir={sortDir}
              onClick={() => toggleSort("count")}
              align="right"
            />
          </div>
          <ul className="divide-y divide-border/60">
            {sorted.map((entry, index) => (
              <li key={entry.userId} className="flex items-center gap-3 py-3">
                <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: entry.color ?? accentColor }}
                >
                  {initials(entry.name)}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {entry.name}
                </span>
                <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(entry.count / max) * 100}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
