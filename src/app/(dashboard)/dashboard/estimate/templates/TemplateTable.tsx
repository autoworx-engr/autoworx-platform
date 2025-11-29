"use client";
import { cn } from "@/lib/cn";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pagination } from "antd";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { SquarePen } from "lucide-react";
import ResponsiveTemplateCard from "./ResponsiveTemplateCard";

export interface TemplateData {
  id: string;
  title: string;
  grandTotal: number;
  createdAt: Date | null;
}

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

const defaultTake = 50;

type TTableProps = {
  data: {
    totalEstimate: number;
    data: TemplateData[] | [];
  };
  page?: string;
  take?: string;
};

export default function TemplateTable({ take, page, data }: TTableProps) {
  const { setActionType } = useActionStoreCreateEdit();
  const [currentPage, setCurrentPage] = useState(parseInt(page ?? "", 10) || 1);
  const timezone = useCompanyTimezone();
  const [pageSize, setPageSize] = useState(
    parseInt(take ?? "", 10) || defaultTake
  );

  const allStatusesFromStore = useListsStore((x) => x.statuses);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });

  // optimize calculation with useMemo
  const showPagination = useMemo(() => {
    return data?.totalEstimate > defaultTake;
  }, [data?.totalEstimate]);

  // for preventing unnecessary re-renders
  const handlePageChange = useCallback(
    (page: number, pageSize?: number) => {
      const searchParams = new URLSearchParams(params.toString());
      searchParams.set("page", page.toString());
      if (pageSize) {
        setPageSize(pageSize);
        searchParams.set("take", pageSize.toString());
      } else {
        searchParams.delete("take");
      }
      setCurrentPage(page);
      const newPath = `${pathname}?${searchParams.toString()}`;
      router.push(newPath);
    },
    [params, pathname, router]
  );

  return (
    <div className="min-h-[65vh] overflow-x-scroll rounded-md bg-background xl:overflow-auto xl:overflow-y-hidden flex flex-col ">
      <div className="flex-grow">
        {isMax640 ? (
          <div className="flex  w-full flex-col items-center justify-center gap-y-4">
            {data?.data?.map((data, index) => (
              <ResponsiveTemplateCard
                template={data}
                key={data.id}
                index={index}
              />
            ))}
          </div>
        ) : (
          <table className="w-full">
            {/* Estimate Header */}
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-4 py-2 text-left">Template ID</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Edit</th>
              </tr>
            </thead>

            {/* Estimate List */}
            <tbody>
              {data?.data?.map((data, index) => (
                <tr
                  key={data.id}
                  className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
                >
                  <td className="px-4 py-2 text-left">{data.id}</td>
                  <td className="px-4 py-2 text-left text-[#006D77]">
                    <p className="block h-full w-full">
                      {formatCurrency(+data.grandTotal)}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-left">
                    <p className="block h-full w-full">
                      {moment.tz(data.createdAt, timezone).format("MM/DD/YYYY")}
                    </p>
                  </td>

                  <td className="flex items-center gap-3 px-4 py-2">
                    <Link
                      href={`/dashboard/estimate/templates/create?isEdit=true&templateId=${data?.id}`}
                      className="text-2xl text-blue-600"
                      onClick={() => setActionType("edit")}
                    >
                      <SquarePen size={18} className="text-[#6571FF]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-auto">
          {showPagination && (
            <div className="mt-4 flex justify-end ">
              <Pagination
                className="custom-pagination"
                current={currentPage}
                pageSize={pageSize}
                total={data?.totalEstimate}
                onChange={handlePageChange}
                showSizeChanger={true}
                onShowSizeChange={handlePageChange}
                size={isMax640 ? "small" : "default"}
                responsive={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
