"use client";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Payment, Prisma } from "@prisma/client";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { ArrowDown, Search } from "lucide-react";
import moment from "moment-timezone";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import PaymentMobileCard from "./PaymentMobileCard";

type TProps = {
  paymentInfo: (Payment & {
    invoice: {
      Refund: any;
      client: {
        firstName: string;
        lastName: string | null;
      } | null;
      vehicle: {
        model: string | null;
        year: number | null;
        make: string | null;
        other: string | null;
        id: number;
        type: string | null;
      } | null;
      due: Prisma.Decimal | null;
    } | null;
    other: {
      paymentMethod: {
        name: string;
      } | null;
    } | null;
    deposit: {
      depositMethod: string | null;
      depositNotes: string | null;
    } | null;
    cash: {
      receivedCash: string | null;
    } | null;
  })[];
  total: number;
  timezone: string;
  page?: number;
  take?: number;
};

export default function PaymentDisplay({
  paymentInfo,
  total,
  timezone,
  page,
  take,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [pageSize, setPageSize] = useState(take || 50);
  const [showPagination, setShowPagination] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    setCurrentPage(page || 1);
    setPageSize(take || 50);
  }, [page, take]);

  useEffect(() => {
    if (total > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [total]);

  const handlePageChange = (page: number, pageSize?: number) => {
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
  };

  // paymentInfo is already server-paginated
  const paymentsToRender = paymentInfo;
  if (isDesktop) {
    return (
      <div className="hidden md:block pt-2">
        <div className="relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div className="max-h-[60vh] overflow-auto custom-scrollbar">
            {paymentsToRender.length === 0 ? (
              <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
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
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="h-10 border-b">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Invoice # </th>
                    <th className="px-4 py-2 text-left">Client Name</th>
                    <th className="px-4 py-2 text-left">Vehicle Info</th>
                    <th className="px-4 py-2 text-left">Payment Method</th>
                    <th className="px-4 py-2 text-left">Total Amount</th>
                    <th className="px-4 py-2 text-left">Cash Received</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsToRender?.map((payment, index) => {
                    const paymentStatus =
                      Number(payment.invoice?.due) <= 0 ? "paid" : "due";

                    const refundedAmount = Number(payment.refundedAmount) || 0;

                    const hasRefund = refundedAmount > 0;

                    return (
                      <tr
                        key={payment.id}
                        className={cn(
                          "cursor-pointer py-3 duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
                        )}
                      >
                        <td className="px-4 py-2 text-left">
                          {payment?.date
                            ? moment
                                .tz(payment.date, timezone)
                                .format("MM/DD/YYYY")
                            : ""}
                        </td>

                        <td className="px-4 py-2 text-left">
                          {payment.invoiceId && (
                            <InvoiceModal
                              invoiceId={payment.invoiceId}
                              buttonChild={<button>{payment.invoiceId}</button>}
                              buttonChildClassName="text-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {payment.invoice?.client?.firstName}{" "}
                          {payment.invoice?.client?.lastName}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {payment.invoice?.vehicle?.year || ""}{" "}
                          {payment.invoice?.vehicle?.make}{" "}
                          {payment.invoice?.vehicle?.model}{" "}
                          {payment.invoice?.vehicle?.other
                            ? payment.invoice?.vehicle?.other
                            : ""}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {payment.type === "OTHER"
                            ? payment?.other?.paymentMethod?.name
                            : payment.type === "DEPOSIT"
                              ? `${payment.type} (${payment?.deposit?.depositMethod || "N/A"})`
                              : payment.type}
                        </td>
                        <td className="px-4 py-2 text-left">
                          <div>{formatCurrency(Number(payment.amount))}</div>
                          {Number(payment.tip) > 0 && (
                            <div className="text-xs text-gray-500">
                              Tip: {formatCurrency(Number(payment.tip))}
                            </div>
                          )}
                          {hasRefund && (
                            <div className="flex items-center gap-1 text-red-500 text-xs font-normal">
                              <ArrowDown size={14} strokeWidth={2} />
                              <span>{formatCurrency(refundedAmount)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-left">
                          {payment.cash?.receivedCash
                            ? payment.cash.receivedCash
                            : "N/A"}
                        </td>
                        <td className="text-center">
                          <span
                            className={cn(
                              `border-b px-2 py-1 text-left capitalize`,
                              paymentStatus === "due" &&
                                "bg-[#de5967] text-white rounded-md",
                              paymentStatus === "paid" &&
                                "bg-[#3c8f89] text-white rounded-md",
                            )}
                          >
                            {paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
    );
  }

  return (
    <div>
      <div className="space-y-4 md:hidden">
        {paymentsToRender.map((payment, index) => (
          <PaymentMobileCard
            key={payment.id}
            payment={payment}
            index={index}
            timezone={timezone}
          />
        ))}
      </div>

      {/* Mobile Pagination */}
      {showPagination && (
        <div className="mt-4 flex justify-center pb-4 md:hidden">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            simple
          />
        </div>
      )}
    </div>
  );
}
