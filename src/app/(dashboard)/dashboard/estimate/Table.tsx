"use client";

import { convertInvoice } from "@/actions/estimate/invoice/convert";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import ResponsiveEstimateCard from "@/components/mobile-responsive/estimate/ResponsiveEstimateCard";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { updateServiceAutomationTrigger } from "@/service/service-maintenance-automation-trigger/api";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { Search, SquarePen } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "react-responsive";
import ConvertTo from "./ConvertTo";

export interface InvoiceData {
  id: string;
  clientName: string;
  vehicle: string;
  email: string;
  phone: string;
  grandTotal: number;
  createdAt: Date;
  status?: string;
  type?: string;
  textColor?: string;
  bgColor?: string;
  clientId: number | null;
  deliveredAt?: Date | null;
  isShopBooking?: boolean;
}

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

const defaultTake = 50;

type TTableProps = {
  estimateData: {
    totalEstimate: number;
    data: InvoiceData[] | [];
  };
  page?: string;
  take?: string;
  isInvoice?: boolean;
};

export default function Table({
  take,
  page,
  estimateData,
  isInvoice,
}: TTableProps) {
  const { setActionType } = useActionStoreCreateEdit();
  const [currentPage, setCurrentPage] = useState(parseInt(page ?? "", 10) || 1);
  const timezone = useCompanyTimezone();
  const [pageSize, setPageSize] = useState(
    parseInt(take ?? "", 10) || defaultTake,
  );
  const allStatusesFromStore = useListsStore((x) => x.statuses);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const isMax640 = useMediaQuery({ query: "(max-width: 640px)" });

  const [autoOpenId] = useState(() => params.get("openEstimateId"));

  useEffect(() => {
    if (autoOpenId && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("openEstimateId");
      const queryString = searchParams.toString();
      const newUrl = queryString ? pathname + "?" + queryString : pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [autoOpenId, pathname]);

  // optimize calculation with useMemo
  const showPagination = useMemo(() => {
    return estimateData.totalEstimate > defaultTake;
  }, [estimateData.totalEstimate]);

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

  // Handler for converting an invoice to an estimate or invoice
  const handleConvertedInvoice = async (id: string) => {
    const res = await convertInvoice(id);
    if (res.type === "success") {
      const checkEstimateOrInvoice =
        res.data.type === "Estimate" ? "Invoice" : "Estimate";
      successToast(
        `${checkEstimateOrInvoice} - ${id} converted to ${res.data.type}`,
      );

      if (res?.data?.type == "Invoice") {
        await updateServiceAutomationTrigger({
          companyId: res?.data?.companyId,
          estimateId: res?.data?.id,
          columnId: res?.data?.columnId!,
        });
      }
    } else if (res.type === "globalError") {
      errorToast(res.message);
    }
  };

  return (
    <div className="relative flex h-[70vh] flex-col overflow-hidden rounded-md bg-background">
      {/* Scrollable area — only the table/cards scroll here, header stays sticky within it */}
      <div
        className="flex-1 overflow-auto
        [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {isMax640 ? (
          <div className="flex  w-full flex-col items-center justify-center gap-y-4">
            {estimateData?.data?.map((data, index) => (
              <ResponsiveEstimateCard
                onConvert={() => handleConvertedInvoice(data?.id)}
                invoiceEstimate={data}
                key={data.id}
                index={index}
                autoOpen={data.id === autoOpenId}
              />
            ))}
          </div>
        ) : (
          <>
            {estimateData?.data?.length === 0 ? (
              <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                {/* Ghost Icon Illustration */}
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
                  <Search
                    size={24}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />
                  {/* Decorative ripple effect */}
                  <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
                </div>

                {/* Text Content */}
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
                {/* Estimate Header */}
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="h-10 border-b">
                    <th className="px-4 py-2 text-left">Invoice ID</th>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    {isInvoice && (
                      <th className="px-2 py-2 text-left">Delivered At</th>
                    )}

                    <th className="px-4 py-2 text-left">Edit</th>
                  </tr>
                </thead>

                {/* Estimate List */}
                <tbody>
                  {estimateData?.data?.map((data, index) => (
                    <tr
                      key={data.id}
                      className={cn(
                        "py-3",
                        index % 2 === 0 ? evenColor : oddColor,
                      )}
                    >
                      <td className="px-4 py-2 text-left">
                        <InvoiceModal
                          invoiceId={data.id}
                          buttonChild={<button>{data.id}</button>}
                          buttonChildClassName="block w-full text-blue-600"
                          autoOpen={data.id === autoOpenId}
                        />
                        {data.isShopBooking && (
                          <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            Virtual Shop
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">{data.clientName}</p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">{data.vehicle}</p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">{data.email}</p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">{data.phone}</p>
                      </td>
                      <td className="px-4 py-2 text-left text-[#006D77]">
                        <p className="block h-full w-full">
                          {formatCurrency(+data.grandTotal)}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-left">
                        <p className="block h-full w-full">
                          {moment
                            .tz(data.createdAt, timezone)
                            .format("MM/DD/YYYY")}
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

                      {isInvoice && (
                        <td className="px-4 py-2 text-left">
                          <p className="block h-full w-full">
                            {data?.deliveredAt
                              ? moment
                                  .tz(data?.deliveredAt, timezone)
                                  .format("MM/DD/YYYY")
                              : ""}
                          </p>
                        </td>
                      )}
                      <td className="flex items-center gap-3 px-4 py-2">
                        <ConvertTo
                          onConvert={() => handleConvertedInvoice(data.id)}
                        />
                        <Link
                          href={`/dashboard/estimate/edit/${data.id}?clientId=${data.clientId}`}
                          className="text-2xl text-blue-600"
                          onClick={() => setActionType("edit")}
                        >
                          <SquarePen size={18} className="text-primary" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Fixed footer — outside the scroll area, always pinned to the bottom of the box */}
      {showPagination && (
        <div className="flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={estimateData.totalEstimate}
            onChange={handlePageChange}
            showSizeChanger={true}
            onShowSizeChange={handlePageChange}
            size={isMax640 ? "small" : "default"} // Use smaller size on mobile
            responsive={true}
          />
        </div>
      )}
    </div>
  );
}
