import { db } from "@/lib/db";
import { Service } from "@prisma/client";
import { buildMergedPayments } from "./buildMergedPayments";
import { buildPaymentRows } from "./buildPaymentRows";
import { fetchInvoices, fetchPayments } from "./invoiceQueries";

export async function getPaymentTabData(clientId: number) {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return null;

  const invoices = await fetchInvoices(clientId);

  const originalInvoices = await Promise.all(
    invoices.map(async (invoice) => {
      const vehicle = invoice.vehicleId
        ? await db.vehicle.findUnique({ where: { id: invoice.vehicleId } })
        : null;

      return { ...invoice, vehicle: vehicle?.model ?? "" };
    }),
  );

  const allPayments = await fetchPayments(
    invoices.map((invoice) => invoice.id),
  );

  const { invoicesWithFull, allTransactionEntries } = await buildPaymentRows(
    invoices,
    allPayments,
  );

  const mergedPaymentData = buildMergedPayments(
    invoicesWithFull,
    allTransactionEntries,
    allPayments,
  );

  const totalCustomerPaidAmount = allPayments.reduce(
    (acc, payment) => acc + Number(payment?.amount ?? 0),
    0,
  );

  const totalRefundedAmount = allPayments.reduce((acc, payment) => {
    const actualRefundedAmount = payment.Refund.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );
    return acc + actualRefundedAmount;
  }, 0);

  const totalAmount = invoices.reduce(
    (acc, invoice) =>
      acc +
      (invoice.grandTotal ? parseFloat(invoice.grandTotal.toString()) : 0),
    0,
  );

  const totalServices = [] as (Service & { count: number })[];
  originalInvoices.forEach((invoice) => {
    invoice.invoiceItems.forEach((item) => {
      if (item.serviceId) {
        const service = totalServices.find((s) => s.id === item.serviceId);
        if (service) service.count += 1;
        else totalServices.push({ ...item.service!, count: 1 });
      }
    });
  });

  return {
    invoicesWithFull,
    allTransactionEntries,
    mergedPaymentData,
    totalServices,
    totalAmount,
    totalCustomerPaidAmount,
    totalRefundedAmount,
  };
}
