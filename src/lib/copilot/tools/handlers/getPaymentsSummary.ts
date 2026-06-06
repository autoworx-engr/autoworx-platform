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
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate } = input as Input;

  const [collected, outstanding] = await Promise.all([
    db.payment.aggregate({
      where: {
        companyId: ctx.companyId,
        ...(startDate && endDate
          ? {
              date: {
                gte: new Date(`${startDate}T00:00:00.000Z`),
                lte: new Date(`${endDate}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      _sum: { amount: true, refundedAmount: true },
      _count: { _all: true },
    }),
    db.invoice.aggregate({
      where: {
        companyId: ctx.companyId,
        type: "Invoice",
        due: { gt: 0 },
      },
      _sum: { due: true },
    }),
  ]);

  const totalAmount = Number(collected._sum.amount ?? 0);
  const totalRefunded = Number(collected._sum.refundedAmount ?? 0);
  const totalCollected = totalAmount - totalRefunded;
  const paymentCount = collected._count._all;
  const outstandingBalance = Number(outstanding._sum.due ?? 0);

  return {
    ok: true,
    data: {
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      paymentCount,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      averagePayment:
        paymentCount > 0
          ? Math.round((totalCollected / paymentCount) * 100) / 100
          : 0,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_payments_summary",
  description:
    "Returns payment totals and outstanding balances. Date filter uses Payment.date (not createdAt). Use when the user asks about payments collected, outstanding balances, or how clients paid.",
  permission: "report.payments.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format. Omit for all-time.",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format. Omit for all-time.",
      },
    },
    required: [],
  },
  execute,
});
