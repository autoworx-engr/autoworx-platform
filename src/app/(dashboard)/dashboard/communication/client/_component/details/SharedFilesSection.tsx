"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isAudio, isImage } from "../../_utils";
import SaveAttachment from "./SaveAttachment";

type SharedAttachment = {
  id: number;
  name: string | null;
  url: string;
  createdAt: Date | string;
};
type TabId = "email" | "sms" | "messenger" | "instagram" | "docs" | "audio";

const TABS: { id: TabId; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "messenger", label: "FB" },
  { id: "instagram", label: "IG" },
  { id: "docs", label: "Docs" },
  { id: "audio", label: "Audio" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function groupByMonth<T extends { createdAt: Date | string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupItems]) => {
      const [year, month] = key.split("-").map(Number);
      return { label: `${MONTH_NAMES[month]} ${year}`, items: groupItems };
    });
}

function useInfiniteList<T>(
  items: T[],
  pageSize: number,
  root: React.RefObject<HTMLDivElement | null>,
) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    const rootEl = root.current;
    if (!el || count >= items.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setCount((c) => Math.min(c + pageSize, items.length));
      },
      { root: rootEl, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, items.length, pageSize, root]);

  return { visible: items.slice(0, count), sentinelRef };
}

function ImageGrid({
  attachments,
  label,
}: {
  attachments: SharedAttachment[];
  label: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const images = useMemo(
    () =>
      [...attachments]
        .filter((a) => isImage(a.name ?? ""))
        .sort((a, b) => b.id - a.id),
    [attachments],
  );
  const { visible, sentinelRef } = useInfiniteList(images, 9, scrollRef);
  const groups = useMemo(() => groupByMonth(visible), [visible]);

  if (!images.length) {
    return (
      <p className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        No images shared via {label.toLowerCase()} yet.
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pr-1">
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="sticky top-0 z-10 bg-white pb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
              {group.label}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {group.items.map((a) => (
                <SaveAttachment
                  key={a.id}
                  attachment={a}
                  allAttachments={images}
                  variant="thumbnail"
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}

function ChipList({
  attachments,
  emptyText,
}: {
  attachments: SharedAttachment[];
  emptyText: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(
    () => [...attachments].sort((a, b) => b.id - a.id),
    [attachments],
  );
  const { visible, sentinelRef } = useInfiniteList(sorted, 8, scrollRef);
  const groups = useMemo(() => groupByMonth(visible), [visible]);

  if (!sorted.length) {
    return (
      <p className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {emptyText}
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto pr-1">
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="sticky top-0 z-10 bg-white pb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map((a) => (
                <SaveAttachment
                  key={a.id}
                  attachment={a}
                  allAttachments={sorted}
                  variant="chip"
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}

export default function SharedFilesSection({
  emailAttachments,
  smsAttachments,
  messengerAttachments,
  instagramAttachments,
}: {
  emailAttachments: SharedAttachment[];
  smsAttachments: SharedAttachment[];
  messengerAttachments: SharedAttachment[];
  instagramAttachments: SharedAttachment[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("email");

  const allDocs = useMemo(
    () =>
      [
        ...emailAttachments,
        ...smsAttachments,
        ...messengerAttachments,
        ...instagramAttachments,
      ].filter((a) => !isImage(a.name ?? "") && !isAudio(a.name ?? "")),
    [
      emailAttachments,
      smsAttachments,
      messengerAttachments,
      instagramAttachments,
    ],
  );
  const allAudio = useMemo(
    () =>
      [
        ...emailAttachments,
        ...smsAttachments,
        ...messengerAttachments,
        ...instagramAttachments,
      ].filter((a) => isAudio(a.name ?? "")),
    [
      emailAttachments,
      smsAttachments,
      messengerAttachments,
      instagramAttachments,
    ],
  );

  const totalCount =
    emailAttachments.length +
    smsAttachments.length +
    messengerAttachments.length +
    instagramAttachments.length;
  const tabCounts: Record<TabId, number> = {
    email: emailAttachments.filter((a) => isImage(a.name ?? "")).length,
    sms: smsAttachments.filter((a) => isImage(a.name ?? "")).length,
    messenger: messengerAttachments.filter((a) => isImage(a.name ?? "")).length,
    instagram: instagramAttachments.filter((a) => isImage(a.name ?? "")).length,
    docs: allDocs.length,
    audio: allAudio.length,
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Shared Files
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {totalCount}
        </span>
      </header>

      <div className="mb-4 flex shrink-0 gap-0.5 overflow-x-auto overflow-y-hidden border-b border-zinc-100 dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500"
                  : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
              }`}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "email" && (
          <ImageGrid attachments={emailAttachments} label="Email" />
        )}
        {activeTab === "sms" && (
          <ImageGrid attachments={smsAttachments} label="SMS" />
        )}
        {activeTab === "messenger" && (
          <ImageGrid attachments={messengerAttachments} label="Messenger" />
        )}
        {activeTab === "instagram" && (
          <ImageGrid attachments={instagramAttachments} label="Instagram" />
        )}
        {activeTab === "docs" && (
          <ChipList attachments={allDocs} emptyText="No docs shared yet." />
        )}
        {activeTab === "audio" && (
          <ChipList attachments={allAudio} emptyText="No audio shared yet." />
        )}
      </div>
    </section>
  );
}
