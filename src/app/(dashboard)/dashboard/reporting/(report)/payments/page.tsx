import Calculation from "../../components/Calculation";

import Analytics from "./Analytics";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import moment from "moment";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import AnalyticsVisibility from "./AnalyticsVisibility";
import FilterHeader from "./FilterHeader";
import PaymentDisplay from "./PaymentDisplay";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { Payment } from "@prisma/client";
import { normalizeSearch } from "@/utils/normalizeSearch";

type TProps = {
  searchParams: {
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    page?: string;
    take?: string;
    paymentMethod: string;
  };
};

type TSliderData = {
  id: number;
  min: number;
  max: number;
  defaultValue?: [number, number];
  type: "price" | "cost" | "profit";
};
const filterMultipleSliders: TSliderData[] = [
  {
    id: 1,
    type: "price",
    min: 0,
    max: 300,
    // defaultValue: [50, 250],
  },
  {
    id: 2,
    type: "cost",
    min: 0,
    max: 400,
  },
  {
    id: 3,
    type: "profit",
    min: 0,
    max: 500,
  },
];
export default async function PaymentReportPage({ searchParams }: TProps) {
  const filterOR = [];
  const session = await getServerSession(authOptions);
  const { timezone } = (await getCompanyTimezone()) || {};

  const defaultTake = 50;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const take = searchParams.take
    ? parseInt(searchParams.take, 10)
    : defaultTake;

  const paymentInfo = await db.payment.findMany({
    where: {
      companyId: session?.user?.companyId,
    },
    include: {
      other: {
        include: {
          paymentMethod: true,
        },
      },
      deposit: true,
      cash: true,
      invoice: {
        select: {
          Refund: true,
          due: true,
          vehicle: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  let filteredPayments =
    searchParams?.search && paymentInfo
      ? paymentInfo.filter((payment: any) => {
        if (!payment.invoice?.client && !payment.invoiceId) {
          return false;
        }
        const fullName = `${payment.invoice?.client?.firstName || ""} ${payment.invoice?.client?.lastName || ""}`;
        const invoiceId = payment.invoiceId ? String(payment.invoiceId) : "";
        return (
          normalizeSearch(fullName)?.includes(
            normalizeSearch(searchParams?.search || "")
          ) ||
          normalizeSearch(invoiceId)?.includes(
            normalizeSearch(searchParams?.search || "")
          )
        );
      })
      : paymentInfo;

  if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate = searchParams.startDate
      ? decodeURIComponent(searchParams.startDate!) // e.g. "05/01/2025"
      : null;

    const formattedEndDate = searchParams.endDate
      ? decodeURIComponent(searchParams.endDate!)
      : null;

    const convertedStart = formattedStartDate
      ? moment.tz(formattedStartDate!, "MM/DD/YYYY", timezone).startOf("day")
      : null;

    const convertedEnd = formattedEndDate
      ? moment.tz(formattedEndDate!, "MM/DD/YYYY", timezone).endOf("day")
      : null;

    filteredPayments = filteredPayments.filter((payment) => {
      if (!payment?.date) {
        return false;
      }

      const paymentDate = payment.date ? moment.utc(payment.date) : null;
      return (
        paymentDate &&
        paymentDate.isBetween(convertedStart, convertedEnd, null, "[]")
      );
    });
  }

  if (searchParams.paymentMethod && searchParams.paymentMethod !== "All") {
    // Convert to uppercase for case-insensitive comparison
    const methodToFilter = searchParams.paymentMethod.toUpperCase();

    filteredPayments = filteredPayments.filter((payment) => {
      // Check if the payment type matches the selected method
      // Handle different naming conventions (Card/CARD, Cash/CASH, etc.)
      const paymentType = payment.type.toUpperCase();

      if (methodToFilter === "CHEQUE" && paymentType === "CHECK") {
        return true;
      } else if (
        methodToFilter === "REFUND" &&
        Number(payment?.refundedAmount) > 0
      ) {
        return true;
      }

      return paymentType === methodToFilter;
    });
  }

  const outStandingPayment = await db.payment.findMany({
    where: { companyId: session?.user?.companyId },
    include: {
      invoice: {
        select: {
          due: true,
        },
      },
    },
  });

  function calculateTotal(payments: any[]) {
    return payments.reduce((acc, payment) => {
      const amount = Number(payment.amount || 0);
      const refunded = Number(payment.refundedAmount || 0);
      return acc + (amount - refunded);
    }, 0);
  }

  const totalAmount = calculateTotal(paymentInfo);
  const filteredTotalAmount = calculateTotal(filteredPayments);

  const averageValue =
    totalAmount && paymentInfo.length ? totalAmount / paymentInfo.length : 0;

  const totalRefunded = paymentInfo.reduce(
    (acc, payment) => acc + Number(payment.refundedAmount || 0),
    0
  );

  const refundRate =
    totalAmount + totalRefunded > 0
      ? (totalRefunded / (totalAmount + totalRefunded)) * 100
      : 0;

  const uniqueInvoices = new Map();

  outStandingPayment.forEach((payment) => {
    const invoiceId = payment.invoiceId;
    if (!uniqueInvoices.has(invoiceId)) {
      uniqueInvoices.set(invoiceId, payment.invoice?.due || 0);
    }
  });

  const totalDue = Array.from(uniqueInvoices.values()).reduce(
    (acc, due) => acc + Math.abs(Number(due)),
    0
  );

  return (
    <div className="space-y-5">
      {/* filter section */}
      <FilterHeader
        filterMultipleSliders={filterMultipleSliders}
        searchParams={searchParams}
      />
      <div className="my-7 grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-5">
        <Calculation content="AVERAGE VALUE" amount={averageValue} />
        <Calculation content="OUTSTANDING PAYMENT" amount={totalDue} />
        <Calculation content="TOTAL PAYMENT" amount={totalAmount} />
        <Calculation
          content="TOTAL PAYMENT (Filtered)"
          amount={
            searchParams?.paymentMethod === "Refund"
              ? totalRefunded
              : filteredTotalAmount
          }
        />
        <Calculation content="REFUND RATE" amount={refundRate} isRate={true} />
      </div>
      {/* Replace the existing table and mobile card sections with: */}
      <PaymentDisplay
        paymentInfo={filteredPayments}
        timezone={timezone}
        page={page}
        take={take}
      />{" "}
      {/* Keep the Analytics section */}
      <Suspense fallback="loading...">
        <AnalyticsVisibility>
          <Analytics
            startDate={searchParams.startDate}
            endDate={searchParams.endDate}
          />
        </AnalyticsVisibility>
      </Suspense>
    </div>
  );
}
