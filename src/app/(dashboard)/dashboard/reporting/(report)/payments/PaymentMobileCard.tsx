"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/cn";
import { Payment, Prisma } from "@prisma/client";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";

type TProps = {
  payment: Payment & {
    invoice: {
      client: {
        firstName: string;
        lastName: string | null;
      } | null;
      vehicle: {
        model: string | null;
        other: string | null;
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
    cash: {
      receivedCash: string | null;
    } | null;
  };
  index: number;
  timezone: string;
};

export default function PaymentMobileCard({
  payment,
  index,
  timezone,
}: TProps) {
  const paymentStatus = Number(payment.invoice?.due) <= 0 ? "paid" : "due";

  return (
    <div
      className={`rounded-lg border p-4 shadow-md ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">
          {payment.invoice?.client?.firstName}{" "}
          {payment.invoice?.client?.lastName}
        </div>
        <div
          className={cn(
            `font-medium`,
            paymentStatus === "due" && "font-semibold text-red-500",
            paymentStatus === "paid" && "font-semibold text-[#66738C]",
          )}
        >
          {paymentStatus}
        </div>
      </div>

      <div className="mb-4 text-sm text-[#66738C]">
        {payment.invoice?.vehicle?.year || ""} -{" "}
        {payment.invoice?.vehicle?.make} - {payment.invoice?.vehicle?.model}
        {payment.invoice?.vehicle?.other
          ? " - " + payment.invoice?.vehicle?.other
          : ""}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <div className="text-sm text-[#66738C]">Date</div>
          <div className="font-semibold">
            {payment?.date &&
              FormatUtcToTimezone(payment.date, timezone, "YYYY-MM-DD")}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Invoice #</div>
          <div className="font-semibold">{payment.invoiceId}</div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Payment Method</div>
          <div className="font-semibold">
            {payment.type === "OTHER"
              ? payment?.other?.paymentMethod?.name
              : payment.type === "DEPOSIT"
                ? `${payment.type} (${payment?.deposit?.depositMethod || "N/A"})`
                : payment.type}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Amount</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(Number(payment.amount))}
          </div>
          {Number(payment.tip) > 0 && (
            <div className="text-xs text-gray-500">
              Tip: {formatCurrency(Number(payment.tip))}
            </div>
          )}
        </div>
        <div className="col-span-2">
          <div className="text-sm text-[#66738C]">Cash Received</div>
          <div className="font-semibold text-[#66738C]">
            {payment.cash?.receivedCash ? payment.cash.receivedCash : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
