import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentType: z.enum(["CARD", "CHECK", "CASH", "OTHER", "DEPOSIT"]).optional(),
  cardLastFour: z.string().length(4).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, paymentType, cardLastFour } = input as Input;

  const dateFilter =
    startDate && endDate
      ? {
          date: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`),
          },
        }
      : {};

  const [payments, outstanding] = await Promise.all([
    db.payment.findMany({
      where: {
        companyId: ctx.companyId,
        ...(paymentType ? { type: paymentType } : {}),
        ...dateFilter,
      },
      select: {
        amount: true,
        refundedAmount: true,
        type: true,
        card: { select: { cardType: true, creditCard: true } },
      },
    }),
    db.invoice.aggregate({
      where: { companyId: ctx.companyId, type: "Invoice", due: { gt: 0 } },
      _sum: { due: true },
    }),
  ]);

  // Optional card-last-4 filter in JS (nested optional relation)
  const filtered = cardLastFour
    ? payments.filter((p) => p.card?.creditCard?.endsWith(cardLastFour))
    : payments;

  const byMethod = { card: 0, cash: 0, check: 0, other: 0, deposit: 0 };
  const byCardType = { visa: 0, mastercard: 0, amex: 0, other: 0 };
  let totalAmount = 0;
  let totalRefunded = 0;
  let refundCount = 0;

  for (const p of filtered) {
    const amt = Number(p.amount ?? 0);
    const refunded = Number(p.refundedAmount ?? 0);
    totalAmount += amt;
    totalRefunded += refunded;
    if (refunded > 0) refundCount++;

    if (p.type === "CARD") byMethod.card += amt;
    else if (p.type === "CASH") byMethod.cash += amt;
    else if (p.type === "CHECK") byMethod.check += amt;
    else if (p.type === "DEPOSIT") byMethod.deposit += amt;
    else byMethod.other += amt;

    if (p.card) {
      const ct = p.card.cardType;
      if (ct === "VISA") byCardType.visa += amt;
      else if (ct === "MASTERCARD") byCardType.mastercard += amt;
      else if (ct === "AMEX") byCardType.amex += amt;
      else byCardType.other += amt;
    }
  }

  const totalCollected = totalAmount - totalRefunded;
  const paymentCount = filtered.length;
  const outstandingBalance = Number(outstanding._sum.due ?? 0);

  return {
    ok: true,
    data: {
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      refundCount,
      paymentCount,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      averagePayment:
        paymentCount > 0
          ? Math.round((totalCollected / paymentCount) * 100) / 100
          : 0,
      byMethod: {
        card: Math.round(byMethod.card * 100) / 100,
        cash: Math.round(byMethod.cash * 100) / 100,
        check: Math.round(byMethod.check * 100) / 100,
        other: Math.round(byMethod.other * 100) / 100,
        deposit: Math.round(byMethod.deposit * 100) / 100,
      },
      byCardType:
        byMethod.card > 0 || cardLastFour
          ? {
              visa: Math.round(byCardType.visa * 100) / 100,
              mastercard: Math.round(byCardType.mastercard * 100) / 100,
              amex: Math.round(byCardType.amex * 100) / 100,
              other: Math.round(byCardType.other * 100) / 100,
            }
          : null,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_payments_summary",
  description:
    "Payment totals, outstanding balances, method and card-type breakdown. Filter by payment type (CARD/CASH/CHECK/OTHER/DEPOSIT) or card last-4 digits. Date filter uses Payment.date.",
  permission: "report.payments.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: { type: "string", description: "Start date YYYY-MM-DD." },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      paymentType: {
        type: "string",
        enum: ["CARD", "CHECK", "CASH", "OTHER", "DEPOSIT"],
        description: "Optional filter by payment method.",
      },
      cardLastFour: {
        type: "string",
        description:
          "Optional — filter to payments on a card ending in these 4 digits.",
      },
    },
    required: [],
  },
  execute,
});
