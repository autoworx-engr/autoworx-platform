import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import moment from "moment";
import { getServerSession } from "next-auth";
import PaymentBarChartContainer from "./chart/PaymentBarChartContainer";

const paymentMethods = ["CARD", "CHECK", "CASH", "OTHER", "DEPOSIT", "REFUND"];

type AnalyticsProps = {
  startDate?: string;
  endDate?: string;
};

export default async function Analytics({
  startDate,
  endDate,
}: AnalyticsProps) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return null;

  // Use provided dates or default to all time
  let invoiceDateFilter = {};
  let paymentDateFilter = {};

  if (startDate && endDate) {
    const formattedStartDate = moment(
      decodeURIComponent(startDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");
    const formattedEndDate = moment(
      decodeURIComponent(endDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");

    invoiceDateFilter = {
      createdAt: {
        gte: new Date(`${formattedStartDate}T00:00:00.000Z`),
        lte: new Date(`${formattedEndDate}T23:59:59.999Z`),
      },
    };
    paymentDateFilter = {
      date: {
        gte: new Date(`${formattedStartDate}T00:00:00.000Z`),
        lte: new Date(`${formattedEndDate}T23:59:59.999Z`),
      },
    };
  }
  const invoices = await db.invoice.findMany({
    where: {
      companyId,
      ...invoiceDateFilter,
    },
    select: {
      grandTotal: true,
    },
  });
  const payments = await db.payment.findMany({
    where: {
      companyId,
      ...paymentDateFilter,
    },
    select: {
      amount: true,
      type: true,
      refundedAmount: true,
    },
  });

  const totalInvoicesGrandTotal = invoices.reduce(
    (acc, invoice) => acc + Number(invoice.grandTotal),
    0,
  );

  const totalPayments = payments.reduce(
    (acc, payment) =>
      acc + Number(payment.amount) - Number(payment.refundedAmount || 0),
    0,
  );

  const paymentDue = totalInvoicesGrandTotal - totalPayments;

  const paymentData = paymentMethods.map((method) => {
    return payments.reduce(
      (acc, cur) => {
        if (method === "CHECK" && cur.type === "CHECK") {
          acc.payment += Number(cur.amount) - Number(cur.refundedAmount || 0);
        } else if (method === "REFUND") {
          acc.payment += Number(cur.refundedAmount || 0);
        } else if (cur.type === method) {
          acc.payment += Number(cur.amount) - Number(cur.refundedAmount || 0);
        }
        return acc;
      },
      {
        method: method,
        payment: 0,
      },
    );
  });

  return (
    <div className="rounded-lg border p-6">
      <h1 className="py-4 text-4xl font-bold">Analytics</h1>
      <div className="mx-5 md:mx-10 grid grid-cols-1 gap-x-10 md:gap-x-20">
        {/* bar chart */}
        <PaymentBarChartContainer paymentData={paymentData} />
        {/* pie chart */}
        {/* <div className="flex h-full items-center justify-center rounded-lg border border-gray-300 bg-white p-4 shadow">
          <p className="text-xl font-semibold text-gray-500">Coming Soon...</p>
        </div> */}
        {/* <PaymentPieChartContainer
          totalPayments={totalPayments}
          paymentDue={paymentDue}
        /> */}
      </div>
    </div>
  );
}
