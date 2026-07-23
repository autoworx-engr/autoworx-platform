"use client";
import { deleteEstimateTemplate } from "@/actions/estimate-template/delete";
import { duplicateEstimateTemplate } from "@/actions/estimate-template/duplicate";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pagination, Popconfirm } from "antd";
import { Copy, Search, SquarePen, Trash2 } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMediaQuery } from "react-responsive";
import ResponsiveTemplateCard from "./ResponsiveTemplateCard";

export interface TemplateData {
  id: string;
  title: string;
  grandTotal: number;
  status?: string;
  textColor?: string;
  bgColor?: string;
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
    parseInt(take ?? "", 10) || defaultTake,
  );

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
    [params, pathname, router],
  );

  async function handleDeleteTemplate(id: string) {
    const res = await deleteEstimateTemplate({
      id,
    });

    if (res.type === "success") {
      toast.success("The estimate template deleted successfully!");
    } else if (res.type === "globalError") {
      errorToast(res.message);
    }
  }
  async function handleDuplicateTemplate(id: string) {
    const res = await duplicateEstimateTemplate({
      templateId: id,
    });

    if (res.type === "success") {
      toast.success("The estimate template duplicated successfully!");

      // router.push(
      //   `/dashboard/estimate/templates/create?isEdit=true&templateId=${res?.data?.id}`
      // );
    } else if (res.type === "globalError") {
      errorToast(res.message);
    }
  }

  return (
    <div
      // className="min-h-[65vh] overflow-x-scroll rounded-md bg-background xl:overflow-auto xl:overflow-y-hidden flex flex-col "

      className="relative max-h-[70vh] overflow-auto rounded-md bg-background flex flex-col 
    [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
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
          <>
            {data?.data?.length === 0 ? (
              <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
                  <Search
                    size={24}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />
                  <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
                </div>

                <h3 className="mb-2 text-lg font-bold text-slate-500">
                  No Results Found
                </h3>
                <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
                  We couldn't find what you're looking for. Try adjusting your
                  filters or search terms.
                </p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="h-10 border-b">
                    <th className="px-4 py-2 text-left">Template ID</th>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Edit</th>
                  </tr>
                </thead>

                <tbody>
                  {data?.data?.map((data, index) => (
                    <tr
                      key={data.id}
                      className={cn(
                        "py-3",
                        index % 2 === 0 ? evenColor : oddColor,
                      )}
                    >
                      <td className="px-4 py-2 text-left">{data.id}</td>
                      <td className="px-4 py-2 text-left">{data.title}</td>
                      <td className="px-4 py-2 text-left text-[#006D77]">
                        <p className="block h-full w-full">
                          {formatCurrency(+data.grandTotal)}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">
                          <p
                            className="rounded-md text-center"
                            style={{
                              backgroundColor: data.bgColor,
                              color: data.textColor,
                            }}
                          >
                            {data.status || ""}
                          </p>
                        </p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">
                          {moment
                            .tz(data.createdAt, timezone)
                            .format("MM/DD/YYYY")}
                        </p>
                      </td>

                      <td className="flex items-center gap-3 px-4 py-2">
                        <button
                          onClick={() => handleDuplicateTemplate(data?.id)}
                        >
                          <Copy size={18} className="text-primary" />
                        </button>
                        <Link
                          href={`/dashboard/estimate/templates/create?isEdit=true&templateId=${data?.id}`}
                          className="text-2xl text-blue-600"
                          onClick={() => setActionType("edit")}
                        >
                          <SquarePen size={18} className="text-primary" />
                        </Link>

                        <Popconfirm
                          title="Delete the estimate template"
                          description="Are you sure to delete this estimate template?"
                          okText="Yes"
                          cancelText="No"
                          placement="topLeft"
                          onConfirm={() => handleDeleteTemplate(data?.id)}
                        >
                          <button
                            className="flex items-center  rounded-md text-red-400 py-1 hover:text-red-500"
                            aria-label="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </Popconfirm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
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
