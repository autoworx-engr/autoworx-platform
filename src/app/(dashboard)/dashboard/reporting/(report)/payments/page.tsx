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
import { excludeUnchargedGiftCardPayments } from "@/lib/paymentFilters";
import { PaymentType, Prisma } from "@prisma/client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics - Payments",
  description: "Analyze payment trends and manage overdue invoices",
};

type TProps = {
  searchParams: Promise<{
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    page?: string;
    take?: string;
    paymentMethod: string;
  }>;
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
export default async function PaymentReportPage(props: TProps) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const { timezone = moment.tz.guess() } = (await getCompanyTimezone()) || {};
  const companyId = session?.user?.companyId;

  if (!companyId) {
    throw new Error("Company ID is required for payment reporting.");
  }

  const defaultTake = 50;
  const pageFromSearch = Number.parseInt(searchParams.page || "1", 10);
  const takeFromSearch = Number.parseInt(
    searchParams.take || String(defaultTake),
    10,
  );

  const page =
    Number.isNaN(pageFromSearch) || pageFromSearch < 1 ? 1 : pageFromSearch;
  const take =
    Number.isNaN(takeFromSearch) || takeFromSearch < 1
      ? defaultTake
      : takeFromSearch;

  const filteredWhere: Prisma.PaymentWhereInput = {
    companyId,
    ...excludeUnchargedGiftCardPayments,
  };

  const containsInsensitive = (value: string): Prisma.StringFilter => ({
    contains: value,
    mode: "insensitive",
  });

  const trimmedSearch = searchParams.search?.trim();
  if (trimmedSearch) {
    const [firstNameTerm, ...lastNameParts] = trimmedSearch.split(/\s+/);
    const lastNameTerm = lastNameParts.join(" ");

    filteredWhere.OR = [
      {
        invoiceId: {
          ...containsInsensitive(trimmedSearch),
        },
      },
      {
        invoice: {
          is: {
            client: {
              is: {
                firstName: {
                  ...containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        },
      },
      {
        invoice: {
          is: {
            client: {
              is: {
                lastName: {
                  ...containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        },
      },
      {
        invoice: {
          is: {
            vehicle: {
              is: {
                make: {
                  ...containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        },
      },
      {
        invoice: {
          is: {
            vehicle: {
              is: {
                model: {
                  ...containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        },
      },
      {
        invoice: {
          is: {
            vehicle: {
              is: {
                vin: {
                  ...containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        },
      },
      ...(firstNameTerm && lastNameTerm
        ? [
            {
              invoice: {
                is: {
                  client: {
                    is: {
                      AND: [
                        {
                          firstName: {
                            ...containsInsensitive(firstNameTerm),
                          },
                        },
                        {
                          lastName: {
                            ...containsInsensitive(lastNameTerm),
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          ]
        : []),
    ];
  }

  if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate = decodeURIComponent(searchParams.startDate);
    const formattedEndDate = decodeURIComponent(searchParams.endDate);

    filteredWhere.date = {
      gte: moment
        .tz(formattedStartDate, "MM/DD/YYYY", timezone)
        .startOf("day")
        .utc()
        .toDate(),
      lte: moment
        .tz(formattedEndDate, "MM/DD/YYYY", timezone)
        .endOf("day")
        .utc()
        .toDate(),
    };
  }

  if (searchParams.paymentMethod && searchParams.paymentMethod !== "All") {
    const methodToFilter = searchParams.paymentMethod.toUpperCase();

    if (methodToFilter === "REFUND") {
      filteredWhere.refundedAmount = {
        gt: 0,
      };
    } else {
      const paymentTypeMap: Record<string, PaymentType> = {
        CARD: PaymentType.CARD,
        CASH: PaymentType.CASH,
        CHECK: PaymentType.CHECK,
        CHEQUE: PaymentType.CHECK,
        OTHER: PaymentType.OTHER,
        DEPOSIT: PaymentType.DEPOSIT,
      };

      const mappedType = paymentTypeMap[methodToFilter];
      if (mappedType) {
        filteredWhere.type = mappedType;
      }
    }
  }

  const listInclude = {
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
  } as const;

  const [
    allAggregate,
    filteredAggregate,
    filteredTotalCount,
    filteredPayments,
    outStandingPayment,
  ] = await Promise.all([
    db.payment.aggregate({
      where: {
        companyId,
        ...excludeUnchargedGiftCardPayments,
      },
      _sum: {
        amount: true,
        refundedAmount: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.payment.aggregate({
      where: filteredWhere,
      _sum: {
        amount: true,
        refundedAmount: true,
      },
    }),
    db.payment.count({
      where: filteredWhere,
    }),
    db.payment.findMany({
      where: filteredWhere,
      include: listInclude,
      orderBy: {
        date: "desc",
      },
      skip: (page - 1) * take,
      take,
    }),
    db.payment.findMany({
      where: {
        companyId,
        invoiceId: {
          not: null,
        },
      },
      distinct: ["invoiceId"],
      select: {
        invoiceId: true,
        invoice: {
          select: {
            due: true,
          },
        },
      },
    }),
  ]);

  const allAmount = Number(allAggregate._sum.amount || 0);
  const allRefunded = Number(allAggregate._sum.refundedAmount || 0);

  const totalAmount = allAmount - allRefunded;
  const filteredTotalAmount =
    Number(filteredAggregate._sum.amount || 0) -
    Number(filteredAggregate._sum.refundedAmount || 0);

  const averageValue =
    totalAmount && allAggregate._count._all
      ? totalAmount / allAggregate._count._all
      : 0;

  const totalRefunded = allRefunded;

  const refundRate =
    totalAmount + totalRefunded > 0
      ? (totalRefunded / (totalAmount + totalRefunded)) * 100
      : 0;

  const totalDue = outStandingPayment.reduce(
    (acc, payment) => acc + Math.abs(Number(payment.invoice?.due || 0)),
    0,
  );

  return (
    <div className="space-y-5">
      {/* filter section */}
      <div className="mb-4 mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-5">
        <Calculation content="AVERAGE VALUE" amount={averageValue} />
        <Calculation content="OUTSTANDING PAYMENT" amount={totalDue} />
        <Calculation content="TOTAL PAYMENT" amount={totalAmount} />
        <Calculation
          content="TOTAL PAYMENT (Filtered)"
          amount={
            searchParams?.paymentMethod?.toUpperCase() === "REFUND"
              ? totalRefunded
              : filteredTotalAmount
          }
        />
        <Calculation content="REFUND RATE" amount={refundRate} isRate={true} />
      </div>
      <FilterHeader
        filterMultipleSliders={filterMultipleSliders}
        searchParams={searchParams}
      />
      {/* Replace the existing table and mobile card sections with: */}
      <PaymentDisplay
        paymentInfo={filteredPayments}
        total={filteredTotalCount}
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
