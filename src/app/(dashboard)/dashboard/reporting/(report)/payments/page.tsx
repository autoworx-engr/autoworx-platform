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

type TProps = {
  searchParams: {
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
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
  console.log("🚀 ~ searchParams:", searchParams);
  const session = await getServerSession(authOptions);
  const { timezone } = await getCompanyTimezone();
  if (searchParams.search) {
    filterOR.push({ invoiceId: { contains: searchParams.search?.trim() } });
  } else if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate =
      searchParams.startDate &&
      moment(decodeURIComponent(searchParams.startDate!), "MM-DD-YYYY").format(
        "YYYY-MM-DD",
      );

    const formattedEndDate =
      searchParams.endDate &&
      moment(decodeURIComponent(searchParams.endDate!), "MM-DD-YYYY").format(
        "YYYY-MM-DD",
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
      OR: filterOR.length ? filterOR : undefined,
      companyId: session?.user?.companyId,
      invoice: {
        client: {
          OR: searchParams.search
            ? [
                { firstName: { contains: searchParams.search?.trim() } },
                { lastName: { contains: searchParams.search?.trim() } },
              ]
            : undefined,
        },
      },
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
  });

  // find the average value
  const totalAmount = paymentInfo.reduce(
    (acc, payment) => acc + Number(payment.amount),
    0,
  );

  
  const averageValue =
    totalAmount && paymentInfo.length ? totalAmount / paymentInfo.length : 0;

  // find the outstanding payment (total due)
  const totalDue = paymentInfo.reduce(
    (acc, payment) => acc + Math.abs(Number(payment.invoice?.due)),
    0,
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
      <PaymentDisplay paymentInfo={paymentInfo} timezone={timezone} />      {/* Keep the Analytics section */}
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
