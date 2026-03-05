import React, { useState } from "react";
import Image from "next/image";
import { Company } from "@prisma/client";
import { cn } from "@/lib/cn";

type TProps = {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  unreadCounts: {
    count: number;
    companyId: number;
  }[];
};

export default function List({
  companies,
  selectedCompany,
  setSelectedCompany,
  unreadCounts,
}: TProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getCompanyUnreadCount = (companyId: number) => {
    const found = unreadCounts.find((u) => u.companyId === companyId);
    return found?.count || 0;
  };

  return (
    <div className="app-shadow h-screen w-full overflow-y-auto rounded-lg bg-background p-3 sm:block sm:h-[83vh] sm:w-[23%]">
      {/* Search */}
      <input
        type="text"
        placeholder="Search company"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="my-3 w-full rounded-md border-2 border-[#006D77] p-2"
      />

      <div className="flex flex-col gap-2">
        {companies
          .filter((company) =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((company) => {
            const unread = getCompanyUnreadCount(company.id);

            return (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2 transition",
                  selectedCompany?.id === company.id
                    ? "bg-teal-600 text-white"
                    : "bg-white",
                )}
              >
                <Image
                  src={company.image || "/icons/business.png"}
                  alt={company.name}
                  width={40}
                  height={40}
                  className="rounded-full"
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
          })}
      </div>
    </div>
  );
}
