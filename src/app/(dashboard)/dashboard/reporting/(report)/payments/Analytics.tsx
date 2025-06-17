import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import PaymentBarChartContainer from "./chart/PaymentBarChartContainer";
import PaymentPieChartContainer from "./chart/PaymentPieChartContainer";
import moment from "moment";

const paymentMethods = ["CARD", "CHECK", "CASH", "OTHER"];

type AnalyticsProps = {
  startDate?: string;
  endDate?: string;
};

export default async function Analytics({ startDate, endDate }: AnalyticsProps) {
  const session = await getServerSession(authOptions);
  
  // Use provided dates or default to all time
  let dateFilter = {};
  
  if (startDate && endDate) {
    const formattedStartDate = moment(decodeURIComponent(startDate), "MM-DD-YYYY").format("YYYY-MM-DD");
    const formattedEndDate = moment(decodeURIComponent(endDate), "MM-DD-YYYY").format("YYYY-MM-DD");
    
    dateFilter = {
      createdAt: {
        gte: new Date(`${formattedStartDate}T00:00:00.000Z`),
        lte: new Date(`${formattedEndDate}T23:59:59.999Z`),
      },
    };
  }
  const invoices = await db.invoice.findMany({
    where: {
      companyId: session?.user?.companyId,
      ...dateFilter,
    },
    select: {
      grandTotal: true,
    },
  });
  const payments = await db.payment.findMany({
    where: {
      companyId: session?.user?.companyId,
      ...dateFilter,
    },
    select: {
      amount: true,
      type: true,
    },
  });

  const totalInvoicesGrandTotal = invoices.reduce(
    (acc, invoice) => acc + Number(invoice.grandTotal),
    0,
  );

  const totalPayments = payments.reduce(
    (acc, payment) => acc + Number(payment.amount),
    0,
  );

  const paymentDue = totalInvoicesGrandTotal - totalPayments;

  const paymentData = paymentMethods.map((method) => {
    return payments.reduce(
      (acc, cur) => {
        if (cur.type === method) {
          acc.payment += Number(cur.amount);
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
      <div className="mx-10 grid grid-cols-2 space-x-20">
        {/* bar chart */}
        <PaymentBarChartContainer paymentData={paymentData} />
        {/* pie chart */}
        <PaymentPieChartContainer
          totalPayments={totalPayments}
          paymentDue={paymentDue}
        />
      </div>
    </div>
  );
}
