import { ReturnPayment } from "@/actions/payment/getPayments";
import {
  getPaymentsPaginated,
  type PaymentMethodFilter,
  type PaymentStatusFilter,
} from "@/actions/payment/getPaymentsPaginated";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { usePaymentFilterStore } from "@/stores/paymentFilter";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import moment from "moment-timezone";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RefundModal from "./RefundModal";

export default function PaymentTable() {
  const { search, dateRange, amount, paidStatus, paymentMethod } =
    usePaymentFilterStore();
  const timezone = useCompanyTimezone();

  const [rows, setRows] = useState<ReturnPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dateRange, amount, paidStatus, paymentMethod]);

  const requestPayload = useMemo(() => {
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange[0] && dateRange[1]) {
      const startStr = moment(dateRange[0]).format("YYYY-MM-DD");
      const endStr = moment(dateRange[1]).format("YYYY-MM-DD");

      startDate = moment
        .tz(startStr, timezone)
        .startOf("day")
        .utc()
        .toISOString();

      endDate = moment.tz(endStr, timezone).endOf("day").utc().toISOString();
    }

    return {
      page: currentPage,
      pageSize,
      search: debouncedSearch,
      startDate,
      endDate,
      amountMin: amount[0],
      amountMax: amount[1],
      paidStatus: paidStatus as PaymentStatusFilter,
      paymentMethod: paymentMethod as PaymentMethodFilter,
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    dateRange,
    timezone,
    amount,
    paidStatus,
    paymentMethod,
  ]);

  const fetchPayments = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      const result = await getPaymentsPaginated(requestPayload);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRows(result.data);
      setTotal(result.total);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setRows([]);
      setTotal(0);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [requestPayload]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefreshPayments = useCallback(async () => {
    await fetchPayments();
  }, [fetchPayments]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const showPagination = total > 10;

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh] flex flex-col">
      <div className="mx-auto flex-1 flex flex-col space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Payments{" "}
            <span className="text-slate-400 font-normal">({total})</span>
          </h3>
        </div>

        <div className="relative flex flex-1 h-full flex-col overflow-hidden rounded-md bg-background">
          <div className="flex-1 overflow-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-4">
              {loading ? (
                <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                  <h3 className="mb-2 text-lg font-bold text-slate-500">
                    Loading payments...
                  </h3>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
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
                rows.map((item, index) => (
                  <div
                    key={item.id}
                    className={`w-full rounded-lg border border-gray-100 p-6 shadow-md transition-all duration-200 ${
                      index % 2 !== 0
                        ? "bg-blue-50/80 dark:bg-slate-900"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/dashboard/estimate/view/${item.invoiceId}`}
                          className="text-lg font-semibold text-primary"
                        >
                          {item.invoiceId}
                        </Link>
                        <p className="font-semibold text-[#66738C]">
                          {FormatUtcToTimezone(
                            item.date,
                            timezone,
                            "MM/DD/YYYY",
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/dashboard/client/${item?.client?.id && item?.client?.id !== undefined ? item?.client?.id : ""}`}
                          className="line-clamp-1 text-lg font-semibold"
                        >
                          {item?.client?.name &&
                          item?.client?.name !== undefined
                            ? item?.client?.name
                            : "- - -"}
                        </Link>
                        <div>
                          <p className="text-lg font-semibold text-[#66738C]">
                            {formatCurrency(item.amount)}
                          </p>
                          {item.tip > 0 && (
                            <p className="text-xs text-gray-500">
                              Tip: {formatCurrency(item.tip)}
                            </p>
                          )}
                          {item.refundedAmount > 0 && (
                            <p className="text-sm text-red-500">
                              Refunded: {formatCurrency(item.refundedAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-[#66738C]">
                          {item?.vehicle && item?.vehicle !== undefined
                            ? item?.vehicle
                            : "- - -"}
                        </p>
                        <p className="text-lg font-semibold text-[#66738C]">
                          {item.method}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-[#66738C]">Cash Received:</p>
                        <p className="text-sm font-semibold text-[#66738C]">
                          {item.cashReceived ? item.cashReceived : "N/A"}
                        </p>
                      </div>{" "}
                      {item.method !== "Virtual Shop Gift Card" &&
                        item.method !== "Virtual Shop Gift Card Reload" && (
                          <div className="flex justify-end">
                            <RefundModal
                              paymentId={item.id}
                              paymentType={item.paymentType}
                              totalAmount={item.amount}
                              refundedAmount={item.refundedAmount}
                              refundMethod={item.refundMethod}
                              refundReason={item.refundReason}
                              refundDate={item.refundDate}
                              onRefundSuccess={onRefreshPayments}
                            />
                          </div>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              {loading ? (
                <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                  <h3 className="mb-2 text-lg font-bold text-slate-500">
                    Loading payments...
                  </h3>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex min-h-[calc(100vh-250px)] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
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
                      <th className="px-4 py-2 text-left">Invoice#</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Vehicle Info</th>
                      <th className="px-4 py-2 text-left">Transaction Date</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Cash Received</th>
                      <th className="px-4 py-2 text-left">Method</th>
                      <th className="px-4 py-2 text-left">Refund</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "py-3",
                          index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
                        )}
                      >
                        <td className="px-4 py-2 text-left">
                          <InvoiceModal
                            invoiceId={item.invoiceId}
                            buttonChild={<button>{item.invoiceId}</button>}
                            buttonChildClassName="text-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-left">
                          <Link
                            href={`/dashboard/client/${item?.client?.id && item?.client?.id !== undefined ? item?.client?.id : ""}`}
                            className="text-blue-500"
                          >
                            {item?.client?.name &&
                            item?.client?.name !== undefined
                              ? item?.client?.name
                              : "- - -"}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-left">
                          {item?.vehicle && item?.vehicle !== undefined
                            ? item?.vehicle
                            : "- - -"}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {FormatUtcToTimezone(
                            item.date,
                            timezone,
                            "MM/DD/YYYY",
                          )}
                        </td>
                        <td className="px-4 py-2 text-left">
                          <div>
                            <div>{formatCurrency(item.amount)}</div>
                            {item.tip > 0 && (
                              <div className="text-xs text-gray-500">
                                Tip: {formatCurrency(item.tip)}
                              </div>
                            )}
                            {item.refundedAmount > 0 && (
                              <div className="text-sm text-red-500">
                                Refunded: {formatCurrency(item.refundedAmount)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-left">
                          {item.cashReceived ? item.cashReceived : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-left">{item.method}</td>
                        <td className="px-4 py-2 text-left">
                          {item.method !== "Virtual Shop Gift Card" &&
                            item.method !== "Virtual Shop Gift Card Reload" && (
                              <RefundModal
                                paymentId={item.id}
                                paymentType={item.paymentType}
                                totalAmount={item.amount}
                                refundedAmount={item.refundedAmount}
                                refundMethod={item.refundMethod}
                                refundReason={item.refundReason}
                                refundDate={item.refundDate}
                                onRefundSuccess={onRefreshPayments}
                              />
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showPagination && (
            <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
              <Pagination
                className="custom-pagination"
                current={currentPage}
                pageSize={pageSize}
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
