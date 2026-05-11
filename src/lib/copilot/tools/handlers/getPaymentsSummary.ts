import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate } = input as Input;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const payments = await db.payment.findMany({
    where: {
      companyId: ctx.companyId,
      createdAt: { gte: start, lte: end },
    },
    select: { amount: true, type: true },
  });

  const byMethod = { card: 0, cash: 0, check: 0, other: 0 };
  let total = 0;

  for (const p of payments) {
    const amt = Number(p.amount ?? 0);
    total += amt;
    if (p.type === "CARD") byMethod.card += amt;
    else if (p.type === "CASH") byMethod.cash += amt;
    else if (p.type === "CHECK") byMethod.check += amt;
    else byMethod.other += amt;
  }

  return {
    ok: true,
    data: {
      total: Math.round(total * 100) / 100,
      byMethod: {
        card: Math.round(byMethod.card * 100) / 100,
        cash: Math.round(byMethod.cash * 100) / 100,
        check: Math.round(byMethod.check * 100) / 100,
        other: Math.round(byMethod.other * 100) / 100,
      },
      paymentCount: payments.length,
      dateRange: { startDate, endDate },
    },
  };
}

registerTool({
  name: "get_payments_summary",
  description:
    "Fetch payment totals by method (card, cash, check, other) for a date range. Use when the user asks about payments collected, how clients paid, or payment totals.",
  permission: "report.payments.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
    },
    required: ["startDate", "endDate"],
  },
  execute,
});
