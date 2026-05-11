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

  const [invoices, materials] = await Promise.all([
    db.invoice.findMany({
      where: {
        companyId: ctx.companyId,
        createdAt: { gte: start, lte: end },
        type: "Invoice",
      },
      select: { grandTotal: true, totalPayment: true },
    }),
    db.material.findMany({
      where: {
        companyId: ctx.companyId,
        createdAt: { gte: start, lte: end },
      },
      select: { cost: true, quantity: true },
    }),
  ]);

  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal ?? 0),
    0,
  );
  const paidCount = invoices.filter(
    (inv) => Number(inv.totalPayment ?? 0) >= Number(inv.grandTotal ?? 0),
  ).length;
  const unpaidCount = invoices.length - paidCount;
  const totalCost = materials.reduce(
    (sum, m) => sum + Number(m.cost ?? 0) * Number(m.quantity ?? 1),
    0,
  );

  return {
    ok: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      grossProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      paidCount,
      unpaidCount,
      dateRange: { startDate, endDate },
    },
  };
}

registerTool({
  name: "get_revenue_summary",
  description:
    "Fetch total revenue, cost, profit, and payment breakdown for a date range. Use when the user asks about earnings, revenue, income, or financial performance.",
  permission: "report.revenue.read",
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
