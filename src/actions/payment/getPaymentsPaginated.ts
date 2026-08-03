"use server";

import type { ReturnPayment } from "@/actions/payment/getPayments";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Prisma, PaymentType } from "@prisma/client";

export type PaymentMethodFilter =
  | "Card"
  | "Cash"
  | "Cheque"
  | "Other"
  | "All"
  | "Deposit"
  | "Refund";

export type PaymentStatusFilter = "All" | "Paid" | "Unpaid";

export interface GetPaymentsPaginatedInput {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  amountMin?: number;
  amountMax?: number;
  paidStatus?: PaymentStatusFilter;
  paymentMethod?: PaymentMethodFilter;
}

export interface GetPaymentsPaginatedResult {
  data: ReturnPayment[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const paymentListSelect = {
  id: true,
  invoiceId: true,
  notes: true,
  date: true,
  amount: true,
  tip: true,
  refundedAmount: true,
  refundMethod: true,
  refundReason: true,
  refundCreatedAt: true,
  type: true,
  cash: {
    select: {
      receivedCash: true,
    },
  },
  other: {
    select: {
      paymentMethod: {
        select: {
          name: true,
        },
      },
    },
  },
  invoice: {
    select: {
      grandTotal: true,
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      vehicle: {
        select: {
          year: true,
          make: true,
          model: true,
          other: true,
        },
      },
    },
  },
} as const;

type PaymentListRecord = Prisma.PaymentGetPayload<{
  select: typeof paymentListSelect;
}>;

type PaidCandidate = {
  id: number;
  amount: Prisma.Decimal | null;
  invoice: { grandTotal: Prisma.Decimal | null } | null;
};

const containsInsensitive = (value: string) => ({
  contains: value,
  mode: "insensitive" as const,
});

function sanitizePagination(input: GetPaymentsPaginatedInput) {
  const page = Number.isFinite(input.page)
    ? Math.max(DEFAULT_PAGE, Math.floor(input.page as number))
    : DEFAULT_PAGE;

  const pageSize = Number.isFinite(input.pageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(input.pageSize as number)))
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

function buildWhereInput(
  companyId: number,
  input: GetPaymentsPaginatedInput,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { companyId };

  if (input.startDate || input.endDate) {
    where.date = {
      ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
      ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
    };
  }

  const amountMin = Number.isFinite(input.amountMin)
    ? Number(input.amountMin)
    : undefined;
  const amountMax = Number.isFinite(input.amountMax)
    ? Number(input.amountMax)
    : undefined;

  if (amountMin !== undefined || amountMax !== undefined) {
    where.amount = {
      ...(amountMin !== undefined ? { gte: amountMin } : {}),
      ...(amountMax !== undefined ? { lte: amountMax } : {}),
    };
  }

  switch (input.paymentMethod) {
    case "Card":
      where.type = PaymentType.CARD;
      break;
    case "Cash":
      where.type = PaymentType.CASH;
      break;
    case "Cheque":
      where.type = PaymentType.CHECK;
      break;
    case "Other":
      where.type = PaymentType.OTHER;
      break;
    case "Deposit":
      where.type = PaymentType.DEPOSIT;
      break;
    case "Refund":
      where.refundedAmount = { gt: 0 };
      break;
    default:
      break;
  }

  const normalizedSearch = (input.search || "").trim();
  if (normalizedSearch) {
    const searchConditions: Prisma.PaymentWhereInput[] = [
      {
        invoiceId: containsInsensitive(normalizedSearch),
      },
      {
        invoice: {
          is: {
            client: {
              is: {
                firstName: containsInsensitive(normalizedSearch),
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
                lastName: containsInsensitive(normalizedSearch),
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
                make: containsInsensitive(normalizedSearch),
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
                model: containsInsensitive(normalizedSearch),
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
                other: containsInsensitive(normalizedSearch),
              },
            },
          },
        },
      },
    ];

    const searchAsYear = Number(normalizedSearch);
    if (Number.isInteger(searchAsYear)) {
      searchConditions.push({
        invoice: {
          is: {
            vehicle: {
              is: {
                year: searchAsYear,
              },
            },
          },
        },
      });
    }

    const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);
    if (searchTerms.length > 1) {
      searchConditions.push({
        invoice: {
          is: {
            client: {
              is: {
                AND: searchTerms.map((term) => ({
                  OR: [
                    { firstName: containsInsensitive(term) },
                    { lastName: containsInsensitive(term) },
                  ],
                })),
              },
            },
          },
        },
      });

      searchConditions.push({
        invoice: {
          is: {
            vehicle: {
              is: {
                AND: searchTerms.map((term) => {
                  const termAsYear = Number(term);
                  return {
                    OR: [
                      { make: containsInsensitive(term) },
                      { model: containsInsensitive(term) },
                      { other: containsInsensitive(term) },
                      ...(Number.isInteger(termAsYear)
                        ? [{ year: termAsYear }]
                        : []),
                    ],
                  };
                }),
              },
            },
          },
        },
      });
    }

    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    where.AND = [...existingAnd, { OR: searchConditions }];
  }

  return where;
}

function parseNotes(notes: string | null): Record<string, any> {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function mapPayment(payment: PaymentListRecord): ReturnPayment {
  const clientFirstName = payment.invoice?.client?.firstName ?? "";
  const clientLastName = payment.invoice?.client?.lastName ?? "";

  const invoiceClientName = `${clientFirstName} ${clientLastName}`.trim();

  const parsedNotes = parseNotes(payment.notes);
  const giftCardPurchaserName =
    !invoiceClientName &&
    (parsedNotes.source === "virtual_shop_gift_card" ||
      parsedNotes.source === "virtual_shop_gift_card_purchase" ||
      parsedNotes.source === "virtual_shop_gift_card_reload")
      ? (parsedNotes.purchaserName as string | undefined)
      : undefined;

  const vehicle = [
    payment.invoice?.vehicle?.year,
    payment.invoice?.vehicle?.make,
    payment.invoice?.vehicle?.model,
    payment.invoice?.vehicle?.other,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: payment.id,
    invoiceId: payment.invoiceId || "",
    client: {
      id: payment.invoice?.client?.id,
      name: invoiceClientName || giftCardPurchaserName || "",
    },
    vehicle,
    date: payment.date as Date,
    amount: Number(payment.amount),
    tip: Number(payment.tip) || 0,
    refundedAmount: Number(payment.refundedAmount) || 0,
    refundMethod: payment.refundMethod as string,
    refundReason: payment.refundReason ?? undefined,
    refundDate: payment.refundCreatedAt ?? undefined,
    method: getPaymentMethod(payment),
    paid: Number(payment.invoice?.grandTotal) <= Number(payment.amount),
    paymentType: payment.type,
    cashReceived: payment.cash?.receivedCash || null,
  };
}

function getPaymentMethod(payment: PaymentListRecord) {
  if (payment.type === PaymentType.CARD) {
    return "Card";
  }
  if (payment.type === PaymentType.CASH) {
    return "Cash";
  }
  if (payment.type === PaymentType.CHECK) {
    return "Cheque";
  }
  if (payment.type === PaymentType.OTHER) {
    return payment.other?.paymentMethod?.name || "Other";
  }
  if (payment.type === PaymentType.DEPOSIT) {
    return "Deposit";
  }

  return "Unknown";
}

function isPaidPayment(payment: PaidCandidate) {
  return Number(payment.invoice?.grandTotal) <= Number(payment.amount);
}

async function getPaymentsWithPaidStatusFilter(
  where: Prisma.PaymentWhereInput,
  page: number,
  pageSize: number,
  paidStatus: PaymentStatusFilter,
): Promise<GetPaymentsPaginatedResult> {
  const candidates = await db.payment.findMany({
    where,
    orderBy: {
      date: "desc",
    },
    select: {
      id: true,
      amount: true,
      invoice: {
        select: {
          grandTotal: true,
        },
      },
    },
  });

  const filteredIds = candidates
    .filter((payment) =>
      paidStatus === "Paid" ? isPaidPayment(payment) : !isPaidPayment(payment),
    )
    .map((payment) => payment.id);

  const total = filteredIds.length;
  const start = (page - 1) * pageSize;
  const pagedIds = filteredIds.slice(start, start + pageSize);

  if (pagedIds.length === 0) {
    return {
      data: [],
      total,
      page,
      pageSize,
    };
  }

  const rows = await db.payment.findMany({
    where: {
      id: {
        in: pagedIds,
      },
    },
    select: paymentListSelect,
  });

  const orderMap = new Map(pagedIds.map((id, index) => [id, index]));
  rows.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));

  return {
    data: rows.map(mapPayment),
    total,
    page,
    pageSize,
  };
}

export async function getPaymentsPaginated(
  input: GetPaymentsPaginatedInput = {},
): Promise<GetPaymentsPaginatedResult> {
  const companyId = await getCompanyId();
  const { page, pageSize } = sanitizePagination(input);
  const where = buildWhereInput(companyId, input);

  if (input.paidStatus && input.paidStatus !== "All") {
    return getPaymentsWithPaidStatusFilter(
      where,
      page,
      pageSize,
      input.paidStatus,
    );
  }

  const [total, rows] = await db.$transaction([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      select: paymentListSelect,
      orderBy: {
        date: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: rows.map(mapPayment),
    total,
    page,
    pageSize,
  };
}
