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
  topN: z.number().int().positive().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, topN = 5 } = input as Input;

  const [totalClients, newClients, clientsWithRevenue, bySource] =
    await Promise.all([
      db.client.count({ where: { companyId: ctx.companyId } }),
      startDate && endDate
        ? db.client.count({
            where: {
              companyId: ctx.companyId,
              createdAt: {
                gte: new Date(`${startDate}T00:00:00.000Z`),
                lte: new Date(`${endDate}T23:59:59.999Z`),
              },
            },
          })
        : Promise.resolve(null),
      db.client.findMany({
        where: { companyId: ctx.companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          Invoice: {
            where: { type: "Invoice", column: { title: "Delivered" } },
            select: { grandTotal: true },
          },
        },
        take: 200,
      }),
      db.client.groupBy({
        by: ["sourceId"],
        where: { companyId: ctx.companyId },
        _count: { _all: true },
      }),
    ]);

  // Top clients by delivered invoice revenue
  const ranked = clientsWithRevenue
    .map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      totalRevenue:
        Math.round(
          c.Invoice.reduce((s, inv) => s + Number(inv.grandTotal ?? 0), 0) *
            100,
        ) / 100,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, topN);

  // Source lookup — get names for non-null sourceIds
  const sourceIds = bySource
    .filter((s) => s.sourceId !== null)
    .map((s) => s.sourceId as number);

  const sources =
    sourceIds.length > 0
      ? await db.source.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, name: true },
        })
      : [];

  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
  const bySourceNamed = bySource.map((s) => ({
    source: s.sourceId ? (sourceMap.get(s.sourceId) ?? "Unknown") : "None",
    count: s._count._all,
  }));

  return {
    ok: true,
    data: {
      totalClients,
      newClients,
      topClients: ranked,
      bySource: bySourceNamed,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_client_stats",
  description:
    "Client statistics — total count, new clients this period, top clients by revenue (delivered invoices), and clients by acquisition source. Date filter for new clients uses Client.createdAt.",
  permission: "client.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (filters new client count by createdAt).",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      topN: {
        type: "number",
        description: "How many top clients to return by revenue (default 5).",
      },
    },
    required: [],
  },
  execute,
});
