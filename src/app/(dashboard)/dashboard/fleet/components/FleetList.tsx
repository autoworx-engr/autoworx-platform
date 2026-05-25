"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { Client, Fleet, Source, Tag } from "@prisma/client";
import { Pagination } from "antd";
import { SearchX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FleetListTable from "./FleetListTable";
// import * as PusherPushNotifications from "@pusher/push-notifications-web";

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

  return (
    <div>
      <div className="h-[60%] overflow-y-auto lg:hidden">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400 dark:text-slate-500">
            <SearchX className="w-10 h-10" />
            <p className="text-sm font-medium">
              {params.get("search")
                ? `No fleet found for "${params.get("search")}"`
                : "No fleet found"}
            </p>
          </div>
        ) : (
          clients.map((employee, index) => (
            <ResponsiveEmployeeCard
              key={index}
              data={employee}
              isFleet={true}
              index={index}
            />
          ))
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex justify-center pb-4 lg:hidden">
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={take}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            simple
          />
        </div>
      )}

      <FleetListTable fleets={clients} total={total} page={page} take={take} />
    </div>
  );
}
