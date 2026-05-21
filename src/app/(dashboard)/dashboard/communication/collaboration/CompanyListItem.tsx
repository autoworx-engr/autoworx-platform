"use client";

import Image from "next/image";
import { Company, User } from "@prisma/client";
import { cn } from "@/lib/cn";
import { useCompanyUnreadCounts } from "./hooks/useCompanyUnreadCounts";

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

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl p-2 transition",
        selectedCompanyId === company.id
          ? "bg-teal-600 text-white"
          : "bg-white",
      )}
    >
      <Image
        src={company.image || "/icons/business.png"}
        alt={company.name}
        width={40}
        height={40}
        className="rounded-full size-10"
      />

      <div className="flex items-center justify-between w-full">
        <p className="truncate font-semibold">{company.name}</p>

        {unread > 0 && (
          <div className="h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </div>
    </button>
  );
}
