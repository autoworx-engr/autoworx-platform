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

export default function PaymentMobileCard({ payment, timezone }: TProps) {
  const paymentStatus = Number(payment.invoice?.due) <= 0 ? "paid" : "due";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700/50 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-base font-semibold text-slate-700 dark:text-white sm:text-lg">
          {payment.invoice?.client?.firstName}{" "}
          {payment.invoice?.client?.lastName}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs font-medium capitalize text-white",
            paymentStatus === "due" && "bg-[#de5967]",
            paymentStatus === "paid" && "bg-[#3c8f89]",
          )}
        >
          {paymentStatus}
        </span>
      </div>

      <div className="mb-3 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
        {payment.invoice?.vehicle?.year || ""} -{" "}
        {payment.invoice?.vehicle?.make} - {payment.invoice?.vehicle?.model}
        {payment.invoice?.vehicle?.other
          ? " - " + payment.invoice?.vehicle?.other
          : ""}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Date
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {payment?.date &&
              FormatUtcToTimezone(payment.date, timezone, "YYYY-MM-DD")}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Invoice #
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {payment.invoiceId}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Payment Method
          </div>
          <div className="break-words font-semibold text-slate-700 dark:text-slate-200">
            {payment.type === "OTHER"
              ? payment?.other?.paymentMethod?.name
              : payment.type === "DEPOSIT"
                ? `${payment.type} (${payment?.deposit?.depositMethod || "N/A"})`
                : payment.type}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Amount
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(Number(payment.amount))}
          </div>
          {Number(payment.tip) > 0 && (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Tip: {formatCurrency(Number(payment.tip))}
            </div>
          )}
        </div>
        <div className="col-span-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Cash Received
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {payment.cash?.receivedCash ? payment.cash.receivedCash : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
