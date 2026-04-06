import { ReturnPayment } from "@/actions/payment/getPayments";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { usePaymentFilterStore } from "@/stores/paymentFilter";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { Pagination } from "antd";
import moment from "moment-timezone";
import Link from "next/link";
import { useEffect, useState } from "react";
import RefundModal from "./RefundModal";
// refundedAmount
export default function PaymentTable({
  data,
  onRefreshPayments,
}: {
  data: ReturnPayment[];
  onRefreshPayments: () => Promise<void>;
}) {
  const { search, dateRange, amount, paidStatus, paymentMethod } =
    usePaymentFilterStore();
  const timezone = useCompanyTimezone();
  const [filteredData, setFilteredData] = useState(data);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);

  function checkPaymentMethod(method: string) {
    if (paymentMethod === "All") {
      return true;
    } else if (method === paymentMethod) {
      return true;
    } else if (paymentMethod === "Refund") return true;
    else if (
      paymentMethod === "Other" &&
      method !== "Card" &&
      method !== "Cash" &&
      method !== "Cheque" &&
      method !== "Deposit"
    ) {
      return true;
    } else {
      return false;
    }
  }

  useEffect(() => {
    setFilteredData(
      data.filter((item) => {
        const [start, end] = dateRange;

        // Safely convert to YYYY-MM-DD string to prevent local time leakage
        const startStr = moment(start).format("YYYY-MM-DD");
        const endStr = moment(end).format("YYYY-MM-DD");

        // Rebuild moment using Detroit timezone from date strings
        const convertedStart = moment
          .tz(startStr, timezone)
          .startOf("day")
          .utc();
        const convertedEnd = moment.tz(endStr, timezone).endOf("day").utc();

        const isWithinDateRange =
          dateRange[0] && dateRange[1]
            ? moment.utc(item.date).isSameOrAfter(convertedStart) &&
              moment.utc(item.date).isSameOrBefore(convertedEnd)
            : true;

        const isWithinAmountRange =
          item.amount >= amount[0] && item.amount <= amount[1];

        const isPaymentMethodMatch = checkPaymentMethod(item.method);

        const isPaidStatusMatch =
          paidStatus === "All"
            ? true
            : paidStatus === "Paid"
              ? item.paid
              : !item.paid;

        const isSearchMatch = search
          ? item.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
            item.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
            item.client.name?.toLowerCase().includes(search.toLowerCase())
          : true;

        const isRefundMatch =
          paymentMethod === "Refund" ? Number(item.refundedAmount) > 0 : true;

        return (
          isWithinDateRange &&
          isWithinAmountRange &&
          isPaidStatusMatch &&
          isSearchMatch &&
          (paymentMethod === "Refund" ? isRefundMatch : isPaymentMethodMatch)
        );
      })
    );
  }, [data, dateRange, amount, paidStatus, paymentMethod, search]);

  useEffect(() => {
    if (filteredData.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredData]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 min-h-[65vh]">
      <div className="mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-100">
            Payments{" "}
            <span className="text-slate-400 font-normal">
              ({filteredData.length})
            </span>
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
                {paginatedData.map((item, index) => (
                  <tr
                    key={index}
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
                        {item?.client?.name && item?.client?.name !== undefined
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4">
          {filteredData.map((item, index) => (
            <div
              key={index}
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
                    className="text-lg font-semibold text-[#6571FF]"
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
              </div>
            </div>
          ))}
        </div>

        {showPagination && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={filteredData.length}
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
