"use client";

import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { Client, Fleet, Source, Tag } from "@prisma/client";
import { Pagination } from "antd";
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
        {clients.map((employee, index) => (
          <ResponsiveEmployeeCard
            key={index}
            data={employee}
            isFleet={true}
            index={index}
          />
        ))}
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
