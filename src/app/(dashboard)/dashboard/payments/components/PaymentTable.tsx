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
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh]">
      <div className="mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Payments{" "}
            <span className="text-slate-400 font-normal">({total})</span>
          </h3>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-hidden rounded-xl p-2 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div
            // className="md:overflow-x-auto"
            className="hidden lg:block overflow-auto max-h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <table className="w-full border-separate border-spacing-0">
              {/*  Header */}
              <thead className="bg-background sticky top-0 ">
                <tr className="h-10 border-b">
                  <th className="border-b px-4 py-2 text-left">Invoice#</th>
                  <th className="border-b px-4 py-2 text-left">Customer</th>
                  <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
                  <th className="border-b px-4 py-2 text-left">
                    Transaction Date
                  </th>
                  <th className="border-b px-4 py-2 text-left">Amount</th>
                  <th className="border-b px-4 py-2 text-left">
                    Cash Received
                  </th>
                  <th className="border-b px-4 py-2 text-left">Method</th>
                  <th className="border-b px-4 py-2 text-left">Refund</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      Loading payments...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  rows.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        index % 2 !== 0
                          ? "bg-blue-50/80 dark:bg-slate-900"
                          : "bg-white dark:bg-slate-900"
                      }`}
                    >
                      <td className="border-b px-4 py-2">
                        <InvoiceModal
                          invoiceId={item.invoiceId}
                          buttonChild={<button>{item.invoiceId}</button>}
                          buttonChildClassName="text-blue-500"
                        />
                      </td>
                      <td className="border-b px-4 py-2">
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
                      <td className="border-b px-4 py-2">
                        {item?.vehicle && item?.vehicle !== undefined
                          ? item?.vehicle
                          : "- - -"}
                      </td>
                      <td className="border-b px-4 py-2">
                        {FormatUtcToTimezone(item.date, timezone, "MM/DD/YYYY")}
                      </td>
                      <td className="border-b px-4 py-2">
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
                      <td className="border-b px-4 py-2">
                        {item.cashReceived ? item.cashReceived : "N/A"}
                      </td>
                      <td className="border-b px-4 py-2">{item.method}</td>{" "}
                      <td className="border-b px-4 py-2">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="rounded-lg border border-gray-100 bg-white p-6 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Loading payments...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white p-6 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No payments found.
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
                      {FormatUtcToTimezone(item.date, timezone, "MM/DD/YYYY")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/client/${item?.client?.id && item?.client?.id !== undefined ? item?.client?.id : ""}`}
                      className="line-clamp-1 text-lg font-semibold"
                    >
                      {item?.client?.name && item?.client?.name !== undefined
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

        {showPagination && (
          <div className="mt-4 flex justify-end">
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
  );
}
