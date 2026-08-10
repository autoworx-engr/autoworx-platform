"use client";

import Image from "next/image";
import { Company, User } from "@prisma/client";
import { cn } from "@/lib/cn";
import { useCompanyUnreadCounts } from "./hooks/useCompanyUnreadCounts";
import { useDraftPreview } from "../_hooks/useDraftPreview";

type Props = {
  company: Company & { users: User[] };
  selectedCompanyId: number | null;
  currentCompanyId: number;
  onSelect: () => void;
};

export default function CompanyListItem({
  company,
  selectedCompanyId,
  currentCompanyId,
  onSelect,
}: Props) {
  const unread = useCompanyUnreadCounts(currentCompanyId, company.id);
  const isSelected = selectedCompanyId === company.id;
  const unreadLabel = unread > 9 ? "9+" : String(unread);
  const draftText = useDraftPreview("collaboration", "", company.id);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg p-3 text-left",
        "border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        isSelected
          ? "border-transparent bg-gradient-to-r from-teal-700 to-teal-600 ring-1 ring-teal-500/60"
          : "border-zinc-200/70 bg-white hover:border-zinc-300/80 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-white/20",
      )}
    >
      {unread > 0 && (
        <div className="absolute right-3 top-3 z-10">
          <div className="relative flex h-5 min-w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadLabel}
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "shrink-0 rounded-full ring-2",
          isSelected ? "ring-teal-600" : "ring-white dark:ring-zinc-900",
        )}
      >
        <Image
          src={company.image || "/icons/business.png"}
          alt={company.name}
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isSelected ? "text-white" : "text-zinc-800 dark:text-zinc-100",
          )}
        >
          {company.name}
        </p>
        {(draftText || company.users?.length > 0) && (
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-xs",
              draftText
                ? "italic text-amber-600 dark:text-amber-500"
                : isSelected
                  ? "text-white/80"
                  : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {draftText
              ? `Draft: ${draftText}`
              : `${company.users.length} ${company.users.length === 1 ? "member" : "members"}`}
          </p>
        )}
      </div>
    </button>
  );
}
