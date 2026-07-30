import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import { PaymentType, Service } from "@prisma/client";
import moment from "moment-timezone";
import EditPaymentModal from "../EditPayment";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

type PaymentInfo = {
  id: number;
  paymentId: number;
  receivedCash?: string | null;
  creditCard?: string | null;
  cardType?: string | null;
  checkNumber?: string | null;
  depositMethod?: string | null;
  depositNotes?: string | null;
};
type CheckInfo = {
  id: number;
  paymentId: number;
  checkNumber: string | null;
};

export type InvoiceWithFull = {
  invoiceItems: Array<Record<string, any>>;
  column: {
    title: string | null;
  } | null;
  grandTotal: number;
  due: number;
  deposit?: number;
  vehicleId: number | null;
  createdAt?: Date;
  customerNotes: string | null;
  id: string;
  vehicle: string;
  paymentMethod: PaymentType | string;
  amountPaid: number;
  refundedAmount: number;
  netAmount: number;
  paymentId: number;

  check: CheckInfo | null;
  notes: string | null;
  paymentMethodInfo: PaymentInfo | null;
  paymentDate?: Date;
};

export default async function PaymentTab({
  clientId,
}: {
  clientId: number | undefined;
}) {
  const { timezone } = await getCompanyTimezone();

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
      deposit: true,
      vehicleId: true,
      createdAt: true,
      customerNotes: true,
      id: true,
    },
  });

  const invoiceIds = invoices.map((invoice) => invoice.id);

  const originalInvoices = await Promise.all(
    invoices.map(async (invoice) => {
      const vehicle = invoice.vehicleId
        ? await db.vehicle.findUnique({ where: { id: invoice.vehicleId } })
        : null;

      return { ...invoice, vehicle: vehicle?.model ?? "" };
    }),
  );

  const invoicesWithFull: InvoiceWithFull[] = [];

  const allPayments = await db.payment.findMany({
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

  const allTransactionEntries = [];

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
      const originalInvoiceDeposit = Number(originalInvoice.deposit || 0);
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

  const totalCustomerPaidAmount = allPayments.reduce((acc, payment) => {
    const originalAmount = Number(payment?.amount ?? 0);
    const netAmount = originalAmount;
    return acc + netAmount;
  }, 0);

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

  const mergedPaymentData = invoiceData.map((inv) => {
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

  return (
    <div className="w-full mx-auto h-full">
      {/* Section 1 */}
      <div className="flex h-[25%] flex-wrap items-center justify-between gap-4 2xl:flex-nowrap md:gap-0">
        <div className="grid w-full grid-cols-2 justify-between border border-slate-400 md:flex md:w-fit">
          <div className="bg-[#F8FAFF] p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Quoted</h3>
            <p className="text-center">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-[#F8FAFF] p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Paid</h3>
            <p className="text-center">
              {formatCurrency(totalCustomerPaidAmount)}
            </p>
          </div>
          <div className="p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Refunded</h3>
            <p className="text-center text-red-600">
              {formatCurrency(totalRefundedAmount)}
            </p>
          </div>
          <div className="p-5 px-2 text-center font-semibold md:px-10">
            <h3>Total Transactions</h3>
            <p className="text-center">{allTransactionEntries?.length || 0}</p>
          </div>
        </div>

        <div className="w-full md:w-96 lg:w-[420px] xl:w-[480px] 2xl:w-[520px] border border-slate-400 text-center text-sm md:text-start">
          <h3 className="p-3 py-1 font-semibold">Top Services</h3>
          <div>
            {totalServices
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((service, index) => (
                <div
                  key={service.id}
                  className={cn(
                    "flex justify-between items-center gap-4 p-3 py-2 transition-colors border-b rounded-xl",
                    index % 2 === 0 ? "bg-white" : "bg-slate-50",
                  )}
                >
                  <p className="truncate pr-2 font-semibold text-slate-600">
                    {service.name}
                  </p>
                  <p className="text-nowrap text-sm font-medium text-primary bg-primary/5 px-1 py-o.5 rounded-lg">
                    Ordered {service.count} times
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <h3 className="mb-1 mt-3 lg:mt-12 font-semibold">Invoice Payments</h3>
      <div className="h-[30%] overflow-scroll rounded-lg border md:rounded-none">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="table-auto w-full text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-10 text-left">Invoice ID</th>
                <th className="px-10 text-left">Vehicle</th>
                <th className="px-10 text-left">Amount</th>
                <th className="px-10 text-left">Method</th>
                <th className="px-10 text-left">Cash Received</th>
                <th className="px-10 text-left">Date</th>
                <th className="text-nowrap px-10 text-left">Due</th>
                <th className="text-nowrap px-10 text-left">Status</th>
                <th className="px-10 text-left">Notes</th>
                <th className="px-10 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoicesWithFull?.map((data, index) => {
                const mergedPayment = mergedPaymentData.find(
                  (m) => m.paymentId === data.paymentId,
                );

                //  Calculate total paid for this specific invoice
                const totalPaidForInvoice = invoicesWithFull
                  .filter((inv) => inv.id === data.id)
                  .reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);
                return (
                  <tr
                    key={data.id}
                    className={cn(
                      "py-3",
                      index % 2 === 0 ? evenColor : oddColor,
                    )}
                  >
                    <td className="h-8 px-10 text-left">
                      <InvoiceModal
                        invoiceId={data.id}
                        buttonChild={
                          <button className="text-primary">{data.id}</button>
                        }
                      />
                    </td>
                    <td className="px-10 text-left">{data.vehicle}</td>
                    {/* <td className="px-10 text-left">
                      {formatCurrency(data.amountPaid)}
                    </td> */}
                    <td className="px-10 text-left">
                      <div className="flex flex-col">
                        <span>{formatCurrency(data.amountPaid)}</span>
                        {data.refundedAmount > 0 && (
                          <span className="text-xs flex text-red-600 mt-1">
                            Refunded: {formatCurrency(data.refundedAmount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 text-left">{data.paymentMethod}</td>
                    <td className="px-10 text-left">
                      {data.paymentMethodInfo &&
                      "receivedCash" in data.paymentMethodInfo &&
                      data.paymentMethodInfo.receivedCash
                        ? data.paymentMethodInfo.receivedCash
                        : "N/A"}
                    </td>
                    <td className="px-10 text-left">
                      {moment(data.paymentDate).format("MM.DD.YYYY")}
                    </td>
                    <td className="px-10 text-left">
                      {formatCurrency(Number(data.due))}
                    </td>
                    <td className="px-10 text-left">{data.column?.title}</td>
                    <td className="px-10 text-left">{data.notes}</td>
                    <td className="px-10 text-left">
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
          {invoicesWithFull.slice(0, 4).map((data, index) => {
            //  Find the merged payment data for this payment
            const mergedPayment = mergedPaymentData.find(
              (m) => m.paymentId === data.paymentId,
            );

            //  Calculate total paid for this specific invoice
            const totalPaidForInvoice = invoicesWithFull
              .filter((inv) => inv.id === data.id)
              .reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);

            return (
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
                      <button className="text-lg font-semibold text-primary">
                        {data.id}
                      </button>
                    }
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(data.amountPaid)}
                      {data.refundedAmount > 0 && (
                        <span className="text-xs flex text-red-600 mt-1">
                          Refunded: {formatCurrency(data.refundedAmount)}
                        </span>
                      )}
                    </p>
                    {/*  Add edit button */}
                    <EditPaymentModal
                      invoiceGrandTotal={Number(data.grandTotal)}
                      mergedPaymentData={mergedPayment}
                      totalPaidForInvoice={totalPaidForInvoice}
                      refundedAmount={data.refundedAmount || 0}
                    />
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Vehicle</p>
                    <p className="text-sm font-medium">{data.vehicle}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Date</p>
                    <p className="text-sm font-medium">
                      {moment(data.paymentDate).format("MM.DD.YYYY")}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Payment Method</p>
                    <p className="text-sm font-medium">{data.paymentMethod}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Cash Received</p>
                    <p className="text-sm font-medium">
                      {data.paymentMethodInfo &&
                      "receivedCash" in data.paymentMethodInfo &&
                      data.paymentMethodInfo.receivedCash
                        ? data.paymentMethodInfo.receivedCash
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Due</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(Number(data.due))}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-[#66738C]">Status</p>
                    <p className="text-sm font-medium">{data.column?.title}</p>
                  </div>
                  {data.notes && (
                    <div className="pt-2">
                      <p className="text-sm text-[#66738C]">Notes</p>
                      <p className="text-sm font-medium">{data.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3 */}
      <h3 className="mb-1 mt-3 font-semibold">Transaction History</h3>
      <div className="h-[30%] overflow-scroll rounded-lg border md:rounded-none">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-xs">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-10 text-left">Type</th>
                <th className="px-10 text-left">Invoice ID</th>
                <th className="px-10 text-left">Vehicle</th>
                <th className="px-10 text-left">Amount</th>
                <th className="px-10 text-left">Cash Received</th>
                <th className="px-10 text-left">Date</th>
                <th className="text-nowrap px-10 text-left">Method</th>
                <th className="px-10 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {allTransactionEntries.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
                >
                  <td className="h-8 px-10 text-left">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        transaction.type === "PAYMENT"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="h-8 px-10 text-left">
                    <InvoiceModal
                      invoiceId={transaction.invoiceId}
                      buttonChild={
                        <button className="text-primary">
                          {transaction.invoiceId}
                        </button>
                      }
                    />
                  </td>
                  <td className="px-10 text-left">{transaction.vehicle}</td>
                  <td
                    className={`px-10 text-left ${
                      transaction.type === "REFUND" ? "text-red-600" : ""
                    }`}
                  >
                    {formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td className="px-10 text-left">
                    {transaction.cashReceived
                      ? transaction.cashReceived
                      : "N/A"}
                  </td>
                  <td className="px-10 text-left">
                    {moment(transaction.date).format("MM.DD.YYYY")}
                  </td>
                  <td className="px-10 text-left">{transaction.method}</td>
                  <td className="px-10 text-left">{transaction.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="grid gap-4 p-4 md:hidden">
          {allTransactionEntries.map((transaction, index) => (
            <div
              key={transaction.id}
              className={cn(
                "rounded-lg p-4 shadow-sm transition-all duration-200",
                index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      transaction.type === "PAYMENT"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {transaction.type}
                  </span>
                  <InvoiceModal
                    invoiceId={transaction.invoiceId}
                    buttonChild={
                      <button className="text-lg font-semibold text-primary">
                        {transaction.invoiceId}
                      </button>
                    }
                  />
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      transaction.type === "REFUND"
                        ? "text-red-600"
                        : "text-primary"
                    }`}
                  >
                    ${Math.abs(transaction.amount).toFixed(2)}
                    {transaction.type === "REFUND" && " (Refunded)"}
                  </p>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Vehicle</p>
                  <p className="text-sm font-medium">{transaction.vehicle}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Date</p>
                  <p className="text-sm font-medium">
                    {moment(transaction.date).format("MM.DD.YYYY")}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Method</p>
                  <p className="text-sm font-medium">{transaction.method}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-[#66738C]">Cash Received</p>
                  <p className="text-sm font-medium">
                    {transaction.cashReceived
                      ? transaction.cashReceived
                      : "N/A"}
                  </p>
                </div>
                {transaction.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-[#66738C]">Notes</p>
                    <p className="text-sm font-medium">{transaction.notes}</p>
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
