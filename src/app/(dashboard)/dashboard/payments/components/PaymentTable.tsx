import { ReturnPayment } from "@/actions/payment/getPayments";
import { usePaymentFilterStore } from "@/stores/paymentFilter";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pagination } from "antd";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import RefundModal from "./RefundModal";

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
    } else if (
      paymentMethod === "Other" &&
      method !== "Card" &&
      method !== "Cash" &&
      method !== "Cheque"
    ) {
      return true;
    } else {
      return false;
    }
  }

  useEffect(() => {
    setFilteredData(
      data.filter((item) => {
        const isWithinDateRange =
          dateRange[0] && dateRange[1]
            ? moment(item.date).isSameOrAfter(dateRange[0], "day") &&
              moment(item.date).isSameOrBefore(dateRange[1], "day")
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

        return (
          isWithinDateRange &&
          isWithinAmountRange &&
          isPaymentMethodMatch &&
          isPaidStatusMatch &&
          isSearchMatch
        );
      }),
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
    currentPage * pageSize,
  );

  return (
    <div className="min-h-[65vh] overflow-x-scroll rounded-md bg-background xl:overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block">
        <table className="w-full">
          {/*  Header */}
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Invoice#</th>
              <th className="border-b px-4 py-2 text-left">Customer</th>
              <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
              <th className="border-b px-4 py-2 text-left">Transaction Date</th>
              <th className="border-b px-4 py-2 text-left">Amount</th>
              <th className="border-b px-4 py-2 text-left">Method</th>
              <th className="border-b px-4 py-2 text-left">Refund</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"}
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
                    {item.refundedAmount > 0 && (
                      <div className="text-sm text-red-500">
                        Refunded: {formatCurrency(item.refundedAmount)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="border-b px-4 py-2">{item.method}</td>
                <td className="border-b px-4 py-2">
                  <RefundModal
                    paymentId={item.id}
                    paymentType={item.paymentType}
                    totalAmount={item.amount + item.refundedAmount}
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

      {/* Mobile View */}
      <div className="grid gap-6 p-4 pb-6 md:hidden">
        {filteredData.map((item, index) => (
          <div
            key={index}
            className={`w-full rounded-lg border border-gray-100 p-6 shadow-md transition-all duration-200 ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
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

              <div className="flex justify-end">
                <RefundModal
                  paymentId={item.id}
                  paymentType={item.paymentType}
                  totalAmount={item.amount + item.refundedAmount}
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
  );
}
