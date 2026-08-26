import { db } from "@/lib/db";
import { InvoiceRow, PaymentRow } from "./invoiceQueries";
import { InvoiceWithFull, TransactionEntry } from "./types";

/** Walks payments oldest-first so `dueAfterPayment` can be reconstructed from
 *  the running total when the column was never persisted. */
export async function buildPaymentRows(
  invoices: InvoiceRow[],
  allPayments: PaymentRow[],
) {
  const invoicesWithFull: InvoiceWithFull[] = [];
  const allTransactionEntries: TransactionEntry[] = [];

  const sortedPayments = allPayments.sort(
    (a, b) =>
      new Date(a.date || a.createdAt).getTime() -
      new Date(b.date || b.createdAt).getTime(),
  );

  for (let i = 0; i < sortedPayments.length; i++) {
    const payment = sortedPayments[i];

    const originalInvoice = invoices.find(
      (inv) => inv.id === payment.invoiceId,
    );
    if (!originalInvoice) continue;

    const vehicle = originalInvoice.vehicleId
      ? await db.vehicle.findUnique({
          where: { id: originalInvoice.vehicleId },
        })
      : null;

    let paymentMethodText = "";
    if (payment.type === "OTHER") {
      const paymentMethodId = payment.other?.paymentMethodId;
      const paymentMethod = paymentMethodId
        ? await db.paymentMethod.findUnique({ where: { id: paymentMethodId } })
        : null;
      paymentMethodText = paymentMethod?.name ?? "";
    } else if (payment.type === "CARD") {
      paymentMethodText = payment?.card?.cardType ?? "";
    } else {
      paymentMethodText = payment?.type ?? "";
    }

    const actualRefundedAmount = payment.Refund.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );
    const originalAmount = Number(payment?.amount ?? 0);
    const netAmount = originalAmount - actualRefundedAmount;

    let dueAfterPayment;
    if (
      payment.dueAfterPayment !== null &&
      payment.dueAfterPayment !== undefined
    ) {
      dueAfterPayment = Number(payment.dueAfterPayment);
    } else {
      const originalInvoiceGrandTotal = Number(originalInvoice.grandTotal || 0);
      const paymentsUpToThis = sortedPayments.slice(0, i + 1);
      const totalPaidUpToThis = paymentsUpToThis.reduce((sum, pmt) => {
        if (pmt.invoiceId === payment.invoiceId) {
          const refunds = pmt.Refund.reduce(
            (refundSum, refund) => refundSum + Number(refund.amount),
            0,
          );
          return sum + Number(pmt.amount || 0) - refunds;
        }
        return sum;
      }, 0);
      dueAfterPayment = originalInvoiceGrandTotal - totalPaidUpToThis;
    }

    invoicesWithFull.push({
      ...originalInvoice,
      vehicle: vehicle?.model ?? "",
      paymentMethod: paymentMethodText,
      amountPaid: originalAmount,
      refundedAmount: actualRefundedAmount,
      netAmount: netAmount,
      paymentId: payment.id,
      check: payment.check
        ? { ...payment.check, checkNumber: payment.check.checkNumber ?? null }
        : null,
      notes: payment.notes ?? null,
      paymentMethodInfo: payment.cash
        ? payment.cash
        : payment.card
          ? payment.card
          : payment.other
            ? payment.other
            : payment.deposit,
      paymentDate: payment.date || originalInvoice.createdAt,
      due: Number(dueAfterPayment),
      grandTotal: Number(originalInvoice.grandTotal || 0),
      deposit: Number(originalInvoice.deposit || 0),
      column: originalInvoice.column
        ? { title: originalInvoice.column.title ?? null }
        : null,
    });

    allTransactionEntries.push({
      id: `payment-${payment.id}`,
      type: "PAYMENT",
      invoiceId: originalInvoice.id,
      vehicle: vehicle?.model ?? "",
      amount: originalAmount,
      date: payment.date || originalInvoice.createdAt,
      method: paymentMethodText,
      notes: payment.notes,
      paymentId: payment.id,
      cashReceived: payment.cash?.receivedCash || null,
    });

    payment.Refund.forEach((refund) => {
      allTransactionEntries.push({
        id: `refund-${refund.id}`,
        type: "REFUND",
        invoiceId: originalInvoice.id,
        vehicle: vehicle?.model ?? "",
        amount: -Number(refund.amount),
        date: refund.refundDate,
        method: refund.method,
        notes: refund.notes || refund.reason,
        paymentId: payment.id,
        refundId: refund.id,
        cashReceived: null,
      });
    });
  }

  allTransactionEntries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { invoicesWithFull, allTransactionEntries };
}
