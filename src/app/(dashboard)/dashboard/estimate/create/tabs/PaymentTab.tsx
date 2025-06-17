import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { Service } from "@prisma/client";
import moment from "moment";
import Link from "next/link";
import React from "react";
import CurrentInvoicePayment from "./CurrentInvoicePayment";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { formatCurrency } from "@/utils/formatCurrency";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default async function PaymentTab({
  clientId,
}: {
  clientId: number | undefined;
}) {
  if (!clientId)
    return (
      <div className="flex h-full items-center justify-center">
        No Client Selected
      </div>
    );

  const client = await db.client.findUnique({
    where: { id: clientId },
  });

  if (!client)
    return (
      <div className="flex h-full items-center justify-center">
        No Client Selected
      </div>
    );

  const invoices = await db.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      invoiceItems: { select: { service: true, serviceId: true, id: true } },
      column: { select: { title: true } },
      grandTotal: true,
      due: true,
      vehicleId: true,
      createdAt: true,
      customerNotes: true,
      id: true,
    },
  });

  // Get all payments for invoices with full details needed
  const invoiceIds = invoices.map((invoice) => invoice.id);

  // This will hold the original invoices for the Invoice Payments section
  const originalInvoices = await Promise.all(
    invoices.map(async (invoice) => {
      const vehicle = invoice.vehicleId
        ? await db.vehicle.findUnique({
            where: { id: invoice.vehicleId },
          })
        : null;

      return {
        ...invoice,
        vehicle: vehicle?.model ?? "",
      };
    }),
  );

  // This will hold the payment-based invoice entries for Transaction History
  const invoicesWithFull = [];

  // Get all payments for all invoices
  const allPayments = await db.payment.findMany({
    where: { invoiceId: { in: invoiceIds } },
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      other: true,
      type: true,
      card: true,
      notes: true,
      cash: true,
      deposit: true,
      createdAt: true, // Get payment date instead of invoice date
    },
  });

  // Create payment-based invoice entries
  for (const payment of allPayments) {
    // Find the original invoice this payment belongs to
    const originalInvoice = invoices.find(
      (inv) => inv.id === payment.invoiceId,
    );

    if (!originalInvoice) continue;

    // Get vehicle info
    const vehicle = originalInvoice.vehicleId
      ? await db.vehicle.findUnique({
          where: { id: originalInvoice.vehicleId },
        })
      : null;

    // Get payment method
    let paymentMethodText = "";

    if (payment.type === "OTHER") {
      const paymentMethodId = payment.other?.paymentMethodId;
      const paymentMethod = paymentMethodId
        ? await db.paymentMethod.findUnique({
            where: { id: paymentMethodId },
          })
        : null;
      paymentMethodText = paymentMethod?.name ?? "";
    } else if (payment.type === "CARD") {
      paymentMethodText = payment?.card?.cardType ?? "";
    } else {
      paymentMethodText = payment?.type ?? "";
    }

    // Create a payment-based entry
    invoicesWithFull.push({
      ...originalInvoice,
      vehicle: vehicle?.model ?? "",
      paymentMethod: paymentMethodText,
      amountPaid: payment?.amount ?? 0,
      paymentId: payment.id,
      notes: payment.notes,
      paymentMethodInfo: payment.cash
        ? payment.cash
        : payment.card
          ? payment.card
          : payment.other
            ? payment.other
            : payment.deposit,
      // Use payment date instead of invoice date if available
      paymentDate: payment.createdAt || originalInvoice.createdAt,
    });
  }

  // Calculate total paid amount
  const totalCustomerPaidAmount = allPayments.reduce(
    (acc, payment) => acc + Number(payment?.amount ?? 0),
    0,
  );

  // Calculate total invoice amount
  const totalAmount = invoices.reduce(
    (acc, invoice) =>
      acc +
      (invoice.grandTotal ? parseFloat(invoice.grandTotal.toString()) : 0),
    0,
  );

  // Count services from original invoices to avoid duplicates
  const totalServices = [] as (Service & { count: number })[];

  originalInvoices.forEach((invoice) => {
    invoice.invoiceItems.forEach((item) => {
      if (item.serviceId) {
        const service = totalServices.find(
          (service) => service.id === item.serviceId,
        );

        if (service) {
          service.count += 1;
        } else {
          totalServices.push({ ...item.service!, count: 1 });
        }
      }
    });
  });

  return (
    <div className="h-full">
      {/* Section 1 */}
      <div className="flex h-[25%] flex-wrap items-center justify-between gap-4 md:flex-nowrap md:gap-0">
        {/* <CurrentInvoicePayment /> */}
        <div className="grid w-full grid-cols-2 justify-between border border-slate-400 md:flex md:w-fit">
          <div className="bg-[#F8FAFF] p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Amount</h3>
            <p className="text-center">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-[#F8FAFF] p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Paid</h3>
            <p className="text-center">
              {formatCurrency(totalCustomerPaidAmount)}
            </p>
          </div>

          <div className="p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Transactions</h3>
            <p className="text-center">{invoicesWithFull?.length || 0}</p>
          </div>
        </div>
        <div className="border border-slate-400 text-center text-sm md:text-start">
          <h3 className="p-3 py-1 font-semibold">Top Services </h3>
          <div>
            {/* top 4 services */}
            {totalServices
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((service, index) => (
                <div
                  key={service.id}
                  className={cn(
                    "flex gap-44 p-3 py-1",
                    index % 2 === 0 ? evenColor : oddColor,
                  )}
                >
                  <p>{service.name}</p>
                  <p>Ordered {service.count} times</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <h3 className="mb-1 mt-3 font-semibold">Invoice Payments</h3>
      <div className="h-[30%] overflow-scroll rounded-lg border md:rounded-none">
        {/* Desktop View */}
        <div className="hidden md:block">
          <table className="w-full text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-10 text-left">Invoice ID</th>
                <th className="px-10 text-left">Vehicle</th>
                <th className="px-10 text-left">Amount</th>
                <th className="px-10 text-left">Date</th>
                <th className="text-nowrap px-10 text-left">Due</th>
                <th className="text-nowrap px-10 text-left">Status</th>
                <th className="px-10 text-left">Notes</th>
              </tr>
            </thead>

            <tbody>
              {invoicesWithFull.slice(0, 4).map((data, index) => (
                <tr
                  key={data.id}
                  className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
                >
                  <td className="h-8 px-10 text-left">
                    <InvoiceModal
                      invoiceId={data.id}
                      buttonChild={
                        <button className="text-[#6571FF]">{data.id}</button>
                      }
                    />
                  </td>
                  <td className="px-10 text-left">{data.vehicle}</td>
                  <td className="px-10 text-left">
                    ${data.amountPaid?.toString()}
                  </td>
                  <td className="px-10 text-left">
                    {moment(data.paymentDate).format("DD.MM.YYYY")}
                  </td>
                  <td className="px-10 text-left">{data.due?.toString()}</td>
                  <td className="px-10 text-left">{data.column?.title}</td>
                  <td className="px-10 text-left">{data.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="grid gap-4 p-4 md:hidden">
          {invoicesWithFull.slice(0, 4).map((data, index) => (
            <div
              key={data.id}
              className={cn(
                "rounded-lg p-4 shadow-sm transition-all duration-200",
                index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
              )}
            >
              <div className="flex items-center justify-between">
                <InvoiceModal
                  invoiceId={data.id}
                  buttonChild={
                    <button className="text-lg font-semibold text-[#6571FF]">
                      {data.id}
                    </button>
                  }
                />
                <p className="text-lg font-bold text-[#6571FF]">
                  ${data.amountPaid?.toString()}
                </p>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Vehicle</p>
                  <p className="text-sm font-medium">{data.vehicle}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Date</p>
                  <p className="text-sm font-medium">
                    {moment(data.paymentDate).format("DD.MM.YYYY")}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Payment Method</p>
                  <p className="text-sm font-medium">{data.paymentMethod}</p>
                </div>
                {data.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-[#66738C]">Notes</p>
                    <p className="text-sm font-medium">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 */}
      <h3 className="mb-1 mt-3 font-semibold">Transaction History</h3>
      <div className="h-[30%] overflow-scroll rounded-lg border md:rounded-none">
        {/* Desktop View */}
        <div className="hidden md:block">
          <table className="w-full text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-10 text-left">Invoice ID</th>
                <th className="px-10 text-left">Vehicle</th>
                <th className="px-10 text-left">Amount</th>
                <th className="px-10 text-left">Date</th>
                <th className="text-nowrap px-10 text-left">Payment Method</th>
                <th className="px-10 text-left">Notes</th>
              </tr>
            </thead>

            <tbody>
              {invoicesWithFull.map((data, index) => (
                <tr
                  key={data.id}
                  className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
                >
                  <td className="h-8 px-10 text-left">
                    <InvoiceModal
                      invoiceId={data.id}
                      buttonChild={
                        <button className="text-[#6571FF]">{data.id}</button>
                      }
                    />
                  </td>
                  <td className="px-10 text-left">{data.vehicle}</td>
                  <td className="px-10 text-left">
                    ${data.amountPaid?.toString()}
                  </td>
                  <td className="px-10 text-left">
                    {moment(data.paymentDate).format("DD.MM.YYYY")}
                  </td>
                  <td className="px-10 text-left">
                    {data.paymentMethod === "CASH" &&
                    "receivedCash" in data.paymentMethodInfo!
                      ? `${data.paymentMethod}-${data.paymentMethodInfo.receivedCash}`
                      : data.paymentMethod}
                  </td>
                  <td className="px-10 text-left">{data.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="grid gap-4 p-4 md:hidden">
          {invoicesWithFull.map((data, index) => (
            <div
              key={data.id}
              className={cn(
                "rounded-lg p-4 shadow-sm transition-all duration-200",
                index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
              )}
            >
              <div className="flex items-center justify-between">
                <InvoiceModal
                  invoiceId={data.id}
                  buttonChild={
                    <button className="text-lg font-semibold text-[#6571FF]">
                      {data.id}
                    </button>
                  }
                />
                <p className="text-lg font-bold text-[#6571FF]">
                  ${data.amountPaid?.toString()}
                </p>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Vehicle</p>
                  <p className="text-sm font-medium">{data.vehicle}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Date</p>
                  <p className="text-sm font-medium">
                    {moment(data.paymentDate).format("DD.MM.YYYY")}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Payment Method</p>
                  <p className="text-sm font-medium">
                    {data.paymentMethod === "CASH" &&
                    "receivedCash" in data.paymentMethodInfo!
                      ? `${data.paymentMethod}-${data.paymentMethodInfo.receivedCash}`
                      : data.paymentMethod}
                  </p>
                </div>
                {data.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-[#66738C]">Notes</p>
                    <p className="text-sm font-medium">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
