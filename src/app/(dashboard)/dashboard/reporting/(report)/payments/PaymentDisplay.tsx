"use client";
import { useMediaQuery } from "react-responsive";
import { Payment, Prisma } from "@prisma/client";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import PaymentMobileCard from "./PaymentMobileCard";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import { useEffect, useState } from "react";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";

type TProps = {
  paymentInfo: (Payment & {
    invoice: {
      client: {
        firstName: string;
        lastName: string | null;
      } | null;
      vehicle: {
        model: string | null;
        year: number | null;
        make: string | null;
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
  })[];
  timezone: string;
};

export default function PaymentDisplay({ paymentInfo, timezone }: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default page size set to 50
  const [showPagination, setShowPagination] = useState(false);
  const [filteredPayments, setFilteredPayments] = useState(paymentInfo);

  useEffect(() => {
    if (paymentInfo.length > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [paymentInfo]);

  useEffect(() => {
    // Filter payments based on payment method if it exists in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentMethodParam = urlParams.get("paymentMethod");

    if (paymentMethodParam && paymentMethodParam !== "All") {
      // Convert to uppercase for case-insensitive comparison
      const methodToFilter = paymentMethodParam.toUpperCase();

      const filtered = paymentInfo.filter((payment) => {
        // Check if the payment type matches the selected method
        // Handle different naming conventions (Card/CARD, Cash/CASH, etc.)
        const paymentType = payment.type.toUpperCase();

        if (methodToFilter === "CHEQUE" && paymentType === "CHECK") {
          return true;
        }

        return paymentType === methodToFilter;
      });

      setFilteredPayments(filtered);
    } else {
      // If "All" is selected or no filter is applied
      setFilteredPayments(paymentInfo);
    }
  }, [paymentInfo, window.location.search]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (isDesktop) {
    return (
      <div className="hidden md:block">
        <table className="w-full shadow-md">
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Date</th>
              <th className="border-b px-4 py-2 text-left">Invoice # </th>
              <th className="border-b px-4 py-2 text-left">Client Name</th>
              <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
              <th className="border-b px-4 py-2 text-left">Payment Method</th>
              <th className="border-b px-4 py-2 text-left">Total Amount</th>
              <th className="border-b px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.map((payment, index) => {
              const paymentStatus =
                Number(payment.invoice?.due) <= 0 ? "paid" : "due";
              return (
                <tr
                  key={payment.id}
                  className={cn(
                    "cursor-pointer rounded-md py-3",
                    index % 2 === 0 ? "bg-background" : "bg-blue-100",
                  )}
                >
                  <td className="border-b px-4 py-2 text-left">
                    {payment?.date &&
                      FormatUtcToTimezone(payment.date, timezone, "YYYY-MM-DD")}
                  </td>

                  <td className="border-b px-4 py-2 text-left">
                    {payment.invoiceId}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {payment.invoice?.client?.firstName}{" "}
                    {payment.invoice?.client?.lastName}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {payment.invoice?.vehicle?.year} -{" "}
                    {payment.invoice?.vehicle?.make} -{" "}
                    {payment.invoice?.vehicle?.model}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {payment.type === "OTHER"
                      ? payment?.other?.paymentMethod?.name
                      : payment.type === "DEPOSIT"
                        ? `${payment.type} (${payment?.deposit?.depositMethod || "N/A"})`
                        : payment.type}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {formatCurrency(Number(payment.amount))}
                  </td>
                  <td
                    className={cn(
                      `border-b px-4 py-2 text-left`,
                      paymentStatus === "due" && "text-red-500",
                      paymentStatus === "paid" && "text-green-500",
                    )}
                  >
                    {paymentStatus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {showPagination && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={filteredPayments.length}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:hidden">
      {filteredPayments.map((payment, index) => (
        <PaymentMobileCard
          key={payment.id}
          payment={payment}
          index={index}
          timezone={timezone}
        />
      ))}
      {/* {showPagination && (
        <div className="mt-4 flex justify-end">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={filteredPayments.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )} */}
    </div>
  );
}
