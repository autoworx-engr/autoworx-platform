"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  onClick: () => void;
  /** Hide unread count when zero or undefined. */
  unreadCount?: number;
  className?: string;
  label?: string;
};

/**
 * Floating "Jump to latest" pill, rendered on top of a chat container's
 * bottom-right corner. The parent owns the show/hide state and the scroll
 * target — this is a pure presentational component.
 */
export default function JumpToLatestButton({
  onClick,
  unreadCount,
  className,
  label = "Jump to latest",
}: Props) {
  const showCount = !!unreadCount && unreadCount > 0;

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5",
        "rounded-full bg-white py-2 pl-2 pr-3",
        "text-xs font-semibold text-[#006D77]",
        "shadow-lg shadow-[#006D77]/30 ring-1 ring-white/10",
        "transition-all duration-200 ease-out",
        "hover:scale-105 hover:bg-[#abced1] active:scale-95",
        "animate-in fade-in slide-in-from-bottom-2",
        className,
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      {showCount ? (
        <span className="tabular-nums ">
          {unreadCount! > 99 ? "99+" : unreadCount} new
        </span>
      ) : (
        <span>Newest</span>
      )}
    </button>
  );
}
