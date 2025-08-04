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

  if (searchParams.search) {
    filterOR.push({ invoiceId: { contains: searchParams.search?.trim() } });
  } else if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate =
      searchParams.startDate &&
      moment(decodeURIComponent(searchParams.startDate!), "MM-DD-YYYY").format(
        "YYYY-MM-DD"
      );

    const formattedEndDate =
      searchParams.endDate &&
      moment(decodeURIComponent(searchParams.endDate!), "MM-DD-YYYY").format(
        "YYYY-MM-DD"
      );
    filterOR.push({
      createdAt: {
        gte:
          formattedStartDate && new Date(`${formattedStartDate}T00:00:00.000Z`), // Start of the day
        lte: formattedEndDate && new Date(`${formattedEndDate}T23:59:59.999Z`), // End of the day
      },
    });
  }

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
      invoice: {
        select: {
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
    // take: take,
    // skip: (page - 1) * take,
  });

  const filteredPayments =
    searchParams?.search && paymentInfo
      ? paymentInfo.filter((payment: any) => {
          if (!payment.invoice.client && !payment.invoice.id) {
            return false;
          }
          const fullName = `${payment.invoice?.client?.firstName} ${payment.invoice?.client?.lastName}`;
          return (
            normalizeSearch(fullName)?.includes(
              normalizeSearch(searchParams?.search || "")
            ) ||
            normalizeSearch(payment.invoice.id)?.includes(
              normalizeSearch(searchParams?.search || "")
            )
          );
        })
      : paymentInfo;

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
  // find the average value
  const totalAmount = paymentInfo.reduce(
    (acc, payment) => acc + Number(payment.amount),
    0
  );

  const averageValue =
    totalAmount && paymentInfo.length ? totalAmount / paymentInfo.length : 0;

  // find the outstanding payment (total due)
  const totalDue = outStandingPayment.reduce(
    (acc, payment) => acc + Math.abs(Number(payment.invoice?.due)),
    0
  );

  return (
    <div className="space-y-5">
      {/* filter section */}
      <FilterHeader
        filterMultipleSliders={filterMultipleSliders}
        searchParams={searchParams}
      />
      <div className="my-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Calculation content="AVERAGE VALUE" amount={averageValue} />
        <Calculation content="OUTSTANDING PAYMENT" amount={totalDue} />
        <Calculation content="TOTAL PAYMENT" amount={totalAmount} />
        <Calculation content="REFUND RATE" amount={0} />
      </div>
      {/* Replace the existing table and mobile card sections with: */}
      <PaymentDisplay
        paymentInfo={filteredPayments}
        timezone={timezone || "America/Detroit"}
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
