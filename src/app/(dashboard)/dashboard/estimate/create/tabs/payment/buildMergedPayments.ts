import { PaymentRow } from "./invoiceQueries";
import { InvoiceWithFull, MergedPayment, TransactionEntry } from "./types";

export function buildMergedPayments(
  invoicesWithFull: InvoiceWithFull[],
  allTransactionEntries: TransactionEntry[],
  allPayments: PaymentRow[],
): MergedPayment[] {
  const invoiceData = invoicesWithFull.map((inv: any) => {
    const payment = allPayments.find((p) => p.id === inv.paymentId);
    const actualPaymentType = payment?.type;
    const isDeposit = actualPaymentType === "DEPOSIT";

    return {
      id: inv.id,
      paymentType: actualPaymentType,
      paymentMethodDisplay: inv.paymentMethod,
      paymentMethodInfo: inv.paymentMethodInfo,
      notes: inv.notes,
      paymentId: inv.paymentId,
      amountPaid: inv.amountPaid,
      card: {
        creditCard: inv.paymentMethodInfo?.creditCard || "",
        cardType: inv.paymentMethodInfo?.cardType || "",
      },
      checkNumber: inv.check?.checkNumber || "",
      cashReceived: inv.paymentMethodInfo?.receivedCash || "",
      depositAmount: isDeposit ? inv.amountPaid : 0,
      depositMethod: inv.paymentMethodInfo?.depositMethod || "",
      depositNotes: inv.paymentMethodInfo?.depositNotes || "",
      grandTotal: inv.grandTotal,
    };
  });

  const transactionData = allTransactionEntries.map((tx: any) => ({
    id: tx.id,
    paymentId: tx.paymentId,
    amount: tx.amount,
    date: tx.date,
    notes: tx.notes,
    type: tx.type,
  }));

  const mergedPaymentData: MergedPayment[] = invoiceData.map((inv) => {
    const tx = transactionData.find((t) => t.paymentId === inv.paymentId);

    return {
      id: inv.paymentId,
      invoiceId: inv.id,
      paymentId: inv.paymentId,
      amount: inv.amountPaid,
      date: tx?.date ?? new Date(),
      type: tx?.type ?? "PAYMENT",
      notes: tx?.notes ?? inv.notes ?? "",
      card: {
        creditCard: inv.card?.creditCard || "",
        cardType: inv.card?.cardType || "",
      },
      checkNumber: inv.checkNumber || "",
      cashReceived: inv.cashReceived || "",
      deposit: inv.depositAmount || 0,
      depositMethod: inv.depositMethod || "",
      depositNotes: inv.depositNotes || "",
      paymentMethod: inv.paymentType,
      paymentMethodDisplay: inv.paymentMethodDisplay,
    };
  });

  return mergedPaymentData;
}
