import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import moment from "moment-timezone";
import EditPaymentModal from "../../EditPayment";
import { cell, evenColor, oddColor, sectionBody, sectionWrap } from "./styles";
import { InvoiceWithFull, MergedPayment } from "./types";

type Props = {
  invoicesWithFull: InvoiceWithFull[];
  mergedPaymentData: MergedPayment[];
};

const cashReceived = (data: InvoiceWithFull) =>
  data.paymentMethodInfo &&
  "receivedCash" in data.paymentMethodInfo &&
  data.paymentMethodInfo.receivedCash
    ? data.paymentMethodInfo.receivedCash
    : "N/A";

export default function InvoicePaymentsSection({
  invoicesWithFull,
  mergedPaymentData,
}: Props) {
  const rowMeta = (data: InvoiceWithFull) => ({
    mergedPayment: mergedPaymentData.find(
      (m) => m.paymentId === data.paymentId,
    ),
    totalPaidForInvoice: invoicesWithFull
      .filter((inv) => inv.id === data.id)
      .reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0),
  });

  if (invoicesWithFull.length === 0) {
    return (
      <section className={sectionWrap}>
        <h3 className="mb-1 mt-3 font-semibold">Invoice Payments</h3>
        <div className="rounded-lg border p-6 text-center text-sm text-slate-500 md:rounded-none">
          No payments recorded for this client yet
        </div>
      </section>
    );
  }

  return (
    <section className={sectionWrap}>
      <h3 className="mb-1 mt-3 font-semibold">Invoice Payments</h3>
      <div className={sectionBody}>
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full min-w-[860px] table-auto text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className={cn(cell, "text-nowrap")}>Invoice ID</th>
                <th className={cell}>Vehicle</th>
                <th className={cell}>Amount</th>
                <th className={cell}>Method</th>
                <th className={cn(cell, "text-nowrap")}>Cash Received</th>
                <th className={cell}>Date</th>
                <th className={cn(cell, "text-nowrap")}>Due</th>
                <th className={cn(cell, "text-nowrap")}>Status</th>
                <th className={cell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoicesWithFull?.map((data, index) => {
                const { mergedPayment, totalPaidForInvoice } = rowMeta(data);
                return (
                  <tr
                    key={data.id}
                    className={cn(
                      "py-3",
                      index % 2 === 0 ? evenColor : oddColor,
                    )}
                  >
                    <td className={cn(cell, "h-8")}>
                      <InvoiceModal
                        invoiceId={data.id}
                        buttonChild={
                          <button className="text-primary">{data.id}</button>
                        }
                      />
                    </td>
                    <td className={cell}>{data.vehicle}</td>
                    <td className={cell}>
                      <div className="flex flex-col">
                        <span className="text-nowrap">
                          {formatCurrency(data.amountPaid)}
                        </span>
                        {data.refundedAmount > 0 && (
                          <span className="mt-1 flex text-nowrap text-xs text-red-600">
                            Refunded: {formatCurrency(data.refundedAmount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cell}>{data.paymentMethod}</td>
                    <td className={cell}>{cashReceived(data)}</td>
                    <td className={cn(cell, "text-nowrap")}>
                      {moment(data.paymentDate).format("MM.DD.YYYY")}
                    </td>
                    <td className={cn(cell, "text-nowrap")}>
                      {formatCurrency(Number(data.due))}
                    </td>
                    <td className={cell}>{data.column?.title}</td>
                    <td className={cell}>
                      <EditPaymentModal
                        invoiceGrandTotal={Number(data.grandTotal)}
                        mergedPaymentData={mergedPayment}
                        totalPaidForInvoice={totalPaidForInvoice}
                        refundedAmount={data.refundedAmount || 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="grid gap-4 p-4 md:hidden">
          {invoicesWithFull.map((data, index) => {
            const { mergedPayment, totalPaidForInvoice } = rowMeta(data);

            return (
              <div
                key={data.id}
                className={cn(
                  "rounded-lg p-4 shadow-sm transition-all duration-200",
                  index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <InvoiceModal
                    invoiceId={data.id}
                    buttonChild={
                      <button className="break-all text-left text-lg font-semibold text-primary">
                        {data.id}
                      </button>
                    }
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-right text-lg font-bold text-primary">
                      {formatCurrency(data.amountPaid)}
                      {data.refundedAmount > 0 && (
                        <span className="mt-1 flex text-xs text-red-600">
                          Refunded: {formatCurrency(data.refundedAmount)}
                        </span>
                      )}
                    </p>
                    <EditPaymentModal
                      invoiceGrandTotal={Number(data.grandTotal)}
                      mergedPaymentData={mergedPayment}
                      totalPaidForInvoice={totalPaidForInvoice}
                      refundedAmount={data.refundedAmount || 0}
                    />
                  </div>
                </div>
                <dl className="mt-2 space-y-2">
                  <Row label="Vehicle" value={data.vehicle} />
                  <Row
                    label="Date"
                    value={moment(data.paymentDate).format("MM.DD.YYYY")}
                  />
                  <Row
                    label="Payment Method"
                    value={data.paymentMethod as string}
                  />
                  <Row label="Cash Received" value={cashReceived(data)} />
                  <Row label="Due" value={formatCurrency(Number(data.due))} />
                  <Row label="Status" value={data.column?.title ?? ""} />
                </dl>
              </div>
            );
          })}
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
