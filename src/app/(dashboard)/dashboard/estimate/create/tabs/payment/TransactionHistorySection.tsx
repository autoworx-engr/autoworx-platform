import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import moment from "moment-timezone";
import { cell, evenColor, oddColor, sectionBody, sectionWrap } from "./styles";
import { TransactionEntry } from "./types";

type Props = { transactions: TransactionEntry[] };

const typeBadge = (type: string) =>
  cn(
    "rounded px-2 py-1 text-xs font-medium text-nowrap",
    type === "PAYMENT"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800",
  );

export default function TransactionHistorySection({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <section className={sectionWrap}>
        <h3 className="mb-1 mt-3 font-semibold">Transaction History</h3>
        <div className="rounded-lg border p-6 text-center text-sm text-slate-500 md:rounded-none">
          No transactions yet
        </div>
      </section>
    );
  }

  return (
    <section className={sectionWrap}>
      <h3 className="mb-1 mt-3 font-semibold">Transaction History</h3>
      <div className={sectionBody}>
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className={cell}>Type</th>
                <th className={cn(cell, "text-nowrap")}>Invoice ID</th>
                <th className={cell}>Vehicle</th>
                <th className={cell}>Amount</th>
                <th className={cn(cell, "text-nowrap")}>Cash Received</th>
                <th className={cell}>Date</th>
                <th className={cn(cell, "text-nowrap")}>Method</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
                >
                  <td className={cn(cell, "h-8")}>
                    <span className={typeBadge(transaction.type)}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className={cn(cell, "h-8")}>
                    <InvoiceModal
                      invoiceId={transaction.invoiceId}
                      buttonChild={
                        <button className="text-primary">
                          {transaction.invoiceId}
                        </button>
                      }
                    />
                  </td>
                  <td className={cell}>{transaction.vehicle}</td>
                  <td
                    className={cn(
                      cell,
                      "text-nowrap",
                      transaction.type === "REFUND" && "text-red-600",
                    )}
                  >
                    {formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td className={cell}>
                    {transaction.cashReceived
                      ? transaction.cashReceived
                      : "N/A"}
                  </td>
                  <td className={cn(cell, "text-nowrap")}>
                    {moment(transaction.date).format("MM.DD.YYYY")}
                  </td>
                  <td className={cell}>{transaction.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="grid gap-4 p-4 md:hidden">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className={cn(
                "rounded-lg p-4 shadow-sm transition-all duration-200",
                index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={typeBadge(transaction.type)}>
                    {transaction.type}
                  </span>
                  <InvoiceModal
                    invoiceId={transaction.invoiceId}
                    buttonChild={
                      <button className="break-all text-left text-lg font-semibold text-primary">
                        {transaction.invoiceId}
                      </button>
                    }
                  />
                </div>
                <p
                  className={cn(
                    "ml-auto text-right text-lg font-bold",
                    transaction.type === "REFUND"
                      ? "text-red-600"
                      : "text-primary",
                  )}
                >
                  ${Math.abs(transaction.amount).toFixed(2)}
                  {transaction.type === "REFUND" && " (Refunded)"}
                </p>
              </div>

              <dl className="mt-2 space-y-2">
                <Row label="Vehicle" value={transaction.vehicle} />
                <Row
                  label="Date"
                  value={moment(transaction.date).format("MM.DD.YYYY")}
                />
                <Row label="Method" value={transaction.method ?? ""} />
                <Row
                  label="Cash Received"
                  value={transaction.cashReceived ?? "N/A"}
                />
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-sm text-[#66738C]">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium">
        {value}
      </dd>
    </div>
  );
}
