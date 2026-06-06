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

  const invoices = await db.invoice.findMany({
    where: {
      companyId: ctx.companyId,
      type: "Invoice",
      column: { title: "Delivered" },
      ...(startDate && endDate
        ? {
            deliveredAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: { grandTotal: true },
  });

  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal ?? 0),
    0,
  );

  return {
    ok: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      invoiceCount: invoices.length,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_revenue_summary",
  description:
    "Returns revenue from DELIVERED invoices only (column = 'Delivered'). Date filter uses Invoice.deliveredAt — not createdAt. Use when the user asks about revenue, earnings, or income.",
  permission: "report.revenue.read",
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
