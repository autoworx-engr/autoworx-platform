"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { Client, Fleet, Source, Tag } from "@prisma/client";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FleetListTable from "./FleetListTable";

export default function FleetList({
  clients,
  total,
  page,
  take,
}: {
  clients: (Client & {
    tag: Tag | null;
    source: Source | null;
    fleet: Fleet | null;
  })[];
  total: number;
  page: number;
  take: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("page", nextPage.toString());

    if (nextPageSize) {
      searchParams.set("take", nextPageSize.toString());
    }

    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
  };

  const showPagination = total > take;

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)]">
      <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Fleet List{" "}
            <span className="text-slate-400 font-normal">({total})</span>
          </h3>
        </div>

        <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
          <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-4">
              {clients.length === 0 ? (
                <EmptyState search={params.get("search")} />
              ) : (
                clients.map((employee, index) => (
                  <ResponsiveEmployeeCard
                    key={index}
                    data={employee as any}
                    isFleet={true}
                    index={index}
                  />
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              {clients.length === 0 ? (
                <EmptyState search={params.get("search")} />
              ) : (
                <FleetListTable fleets={clients} />
              )}
            </div>
          </div>

          {showPagination && (
            <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
              <Pagination
                className="custom-pagination"
                current={page}
                pageSize={take}
                total={total}
                onChange={handlePageChange}
                showSizeChanger
                onShowSizeChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ search }: { search: string | null }) {
  return (
    <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Search size={24} className="text-slate-300" strokeWidth={1.5} />
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">
        No Results Found
      </h3>
      <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
        {search
          ? `We couldn't find any fleet for "${search}". Try adjusting your search terms.`
          : "We couldn't find what you're looking for. Try adjusting your filters or search terms."}
      </p>
    </div>
  );
}
