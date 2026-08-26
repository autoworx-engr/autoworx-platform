import { db } from "@/lib/db";

export function fetchInvoices(clientId: number) {
  return db.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      invoiceItems: { select: { service: true, serviceId: true, id: true } },
      column: { select: { title: true } },
      grandTotal: true,
      due: true,
      deposit: true,
      vehicleId: true,
      createdAt: true,
      customerNotes: true,
      id: true,
    },
  });
}

export function fetchPayments(invoiceIds: string[]) {
  return db.payment.findMany({
    where: { invoiceId: { in: invoiceIds } },
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      dueAfterPayment: true,
      refundedAmount: true,
      other: true,
      type: true,
      card: true,
      check: true,
      notes: true,
      cash: true,
      deposit: true,
      createdAt: true,
      date: true,
      Refund: {
        select: {
          id: true,
          amount: true,
          reason: true,
          method: true,
          refundDate: true,
          notes: true,
        },
      },
    },
  });
}

export type InvoiceRow = Awaited<ReturnType<typeof fetchInvoices>>[number];
export type PaymentRow = Awaited<ReturnType<typeof fetchPayments>>[number];
