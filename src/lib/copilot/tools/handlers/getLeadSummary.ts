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

  const createdAtFilter =
    startDate && endDate
      ? {
          createdAt: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`),
          },
        }
      : {};

  const columnChangedAtFilter =
    startDate && endDate
      ? {
          columnChangedAt: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`),
          },
        }
      : {};

  const [
    totalLeads,
    qualifiedLeads,
    convertedLeads,
    lostLeads,
    bySource,
    convertedWithClients,
  ] = await Promise.all([
    db.lead.count({
      where: { companyId: ctx.companyId, ...createdAtFilter },
    }),
    db.lead.count({
      where: {
        companyId: ctx.companyId,
        isQualified: true,
        ...createdAtFilter,
      },
    }),
    db.lead.count({
      where: {
        companyId: ctx.companyId,
        column: { title: "Converted" },
        ...columnChangedAtFilter,
      },
    }),
    db.lead.count({
      where: {
        companyId: ctx.companyId,
        column: { title: "Lead Lost" },
        ...createdAtFilter,
      },
    }),
    db.lead.groupBy({
      by: ["source"],
      where: { companyId: ctx.companyId, ...createdAtFilter },
      _count: { _all: true },
    }),
    db.lead.findMany({
      where: {
        companyId: ctx.companyId,
        column: { title: "Converted" },
        ...columnChangedAtFilter,
      },
      select: {
        Client: {
          select: {
            Invoice: {
              where: { type: "Invoice" },
              select: { grandTotal: true },
            },
          },
        },
      },
    }),
  ]);

  // Average deal size from converted leads' invoices
  const allInvoiceAmounts = convertedWithClients.flatMap((lead) =>
    lead.Client.flatMap((client) =>
      client.Invoice.map((inv) => Number(inv.grandTotal ?? 0)),
    ),
  );
  const averageDealSize =
    allInvoiceAmounts.length > 0
      ? Math.round(
          (allInvoiceAmounts.reduce((s, v) => s + v, 0) /
            allInvoiceAmounts.length) *
            100,
        ) / 100
      : 0;

  const conversionRate =
    totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

  return {
    ok: true,
    data: {
      totalLeads,
      qualifiedLeads,
      unqualifiedLeads: totalLeads - qualifiedLeads,
      convertedLeads,
      lostLeads,
      conversionRate,
      averageDealSize,
      leadsBySource: bySource.map((s) => ({
        source: s.source,
        count: s._count._all,
      })),
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_lead_summary",
  description:
    "Returns lead analytics — total count, qualified/unqualified breakdown, converted and lost leads, conversion rate, average deal size, and source breakdown. Date filter for counts uses Lead.createdAt; conversion metrics use Lead.columnChangedAt.",
  permission: "lead.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date in YYYY-MM-DD format. Lead counts filtered by createdAt; conversion metrics by columnChangedAt. Omit for all-time.",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format.",
      },
    },
    required: [],
  },
  execute,
});
