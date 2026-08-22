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
    const parts = trimmedSearch.split(/\s+/);

    // Bare 4-digit year, e.g. "2025" -> match vehicle.year directly
    const yearOnly = /^\d{4}$/.test(trimmedSearch)
      ? parseInt(trimmedSearch, 10)
      : null;

    // Try every first/last name split point, not just first-word-only
    const nameCombinations: Prisma.PaymentWhereInput[] =
      parts.length > 1
        ? Array.from({ length: parts.length - 1 }, (_, idx) => {
            const i = idx + 1;
            const firstNameTerm = parts.slice(0, i).join(" ");
            const lastNameTerm = parts.slice(i).join(" ");
            return {
              invoice: {
                is: {
                  client: {
                    is: {
                      AND: [
                        { firstName: containsInsensitive(firstNameTerm) },
                        { lastName: containsInsensitive(lastNameTerm) },
                      ],
                    },
                  },
                },
              },
            } as Prisma.PaymentWhereInput;
          })
        : [];

    // Year + make/model combinations, e.g. "2025 Acura ADX"
    const vehicleYearCombinations: Prisma.PaymentWhereInput[] = (() => {
      if (parts.length < 2) return [];
      const yearNum = /^\d{4}$/.test(parts[0]) ? parseInt(parts[0], 10) : null;
      if (yearNum === null) return [];

      const rest = parts.slice(1);
      const results: Prisma.PaymentWhereInput[] = [];

      for (let i = 1; i < rest.length; i++) {
        const make = rest.slice(0, i).join(" ");
        const model = rest.slice(i).join(" ");
        results.push({
          invoice: {
            is: {
              vehicle: {
                is: {
                  AND: [
                    { year: yearNum },
                    { make: containsInsensitive(make) },
                    { model: containsInsensitive(model) },
                  ],
                },
              },
            },
          },
        } as Prisma.PaymentWhereInput);
      }

      const restStr = rest.join(" ");
      results.push({
        invoice: {
          is: {
            vehicle: {
              is: {
                AND: [
                  { year: yearNum },
                  { make: containsInsensitive(restStr) },
                ],
              },
            },
          },
        },
      } as Prisma.PaymentWhereInput);
      results.push({
        invoice: {
          is: {
            vehicle: {
              is: {
                AND: [
                  { year: yearNum },
                  { model: containsInsensitive(restStr) },
                ],
              },
            },
          },
        },
      } as Prisma.PaymentWhereInput);

      return results;
    })();

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
      ...(yearOnly !== null
        ? [
            {
              invoice: { is: { vehicle: { is: { year: yearOnly } } } },
            } as Prisma.PaymentWhereInput,
          ]
        : []),
      ...nameCombinations,
      ...vehicleYearCombinations,
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
      <PaymentDisplay
        paymentInfo={filteredPayments}
        total={filteredTotalCount}
        timezone={timezone}
        page={page}
        take={take}
      />{" "}
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
