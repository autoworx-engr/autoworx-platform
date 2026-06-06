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
  clientId: z.number().int().positive().optional(),
  vehicleId: z.number().int().positive().optional(),
  includeProfit: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, clientId, vehicleId, includeProfit } =
    input as Input;

  const invoices = await db.invoice.findMany({
    where: {
      companyId: ctx.companyId,
      type: "Invoice",
      column: { title: "Delivered" },
      ...(clientId ? { clientId } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(startDate && endDate
        ? {
            deliveredAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: { grandTotal: true, profit: true },
  });

  const totalRevenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.grandTotal ?? 0),
    0,
  );
  const invoiceCount = invoices.length;
  const averageInvoiceValue =
    invoiceCount > 0
      ? Math.round((totalRevenue / invoiceCount) * 100) / 100
      : 0;

  let totalProfit: number | null = null;
  let totalCost: number | null = null;
  let profitMargin: number | null = null;

  if (includeProfit) {
    totalProfit = invoices.reduce(
      (sum, inv) => sum + Number(inv.profit ?? 0),
      0,
    );
    totalProfit = Math.round(totalProfit * 100) / 100;
    totalCost = Math.round((totalRevenue - totalProfit) * 100) / 100;
    profitMargin =
      totalRevenue > 0
        ? Math.round((totalProfit / totalRevenue) * 10000) / 100
        : 0;
  }

  return {
    ok: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      invoiceCount,
      averageInvoiceValue,
      ...(includeProfit ? { totalProfit, totalCost, profitMargin } : {}),
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_revenue_summary",
  description:
    "Returns revenue from DELIVERED invoices only (column = 'Delivered'). Date filter uses Invoice.deliveredAt. Filter by client or vehicle. Set includeProfit: true for profit/cost/margin breakdown.",
  permission: "report.revenue.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date YYYY-MM-DD. Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      clientId: {
        type: "number",
        description: "Optional — filter to a specific client's revenue.",
      },
      vehicleId: {
        type: "number",
        description: "Optional — filter to a specific vehicle's revenue.",
      },
      includeProfit: {
        type: "boolean",
        description:
          "If true, also returns totalProfit, totalCost, and profitMargin %.",
      },
    },
    required: [],
  },
  execute,
});
