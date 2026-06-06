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
  groupBy: z.enum(["client", "service", "material", "none"]).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, clientId, groupBy = "none" } = input as Input;

  const invoices = await db.invoice.findMany({
    where: {
      companyId: ctx.companyId,
      type: "Invoice",
      column: { title: "Delivered" },
      ...(clientId ? { clientId } : {}),
      ...(startDate && endDate
        ? {
            deliveredAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: {
      grandTotal: true,
      clientId: true,
      client: { select: { firstName: true, lastName: true } },
      invoiceItems: {
        select: {
          serviceDesc: true,
          labor: { select: { charge: true, hours: true } },
          materials: {
            select: { name: true, cost: true, sell: true, quantity: true },
          },
        },
      },
    },
  });

  let totalRevenue = 0;
  let totalCost = 0;

  const byClient = new Map<
    number,
    { name: string; revenue: number; cost: number }
  >();
  const byService = new Map<
    string,
    { revenue: number; cost: number; count: number }
  >();
  const byMaterial = new Map<
    string,
    { totalCost: number; totalSell: number; qty: number }
  >();

  for (const inv of invoices) {
    const revenue = Number(inv.grandTotal ?? 0);
    totalRevenue += revenue;

    let invCost = 0;
    for (const item of inv.invoiceItems) {
      const laborCost =
        Number(item.labor?.charge ?? 0) * Number(item.labor?.hours ?? 0);
      const matCost = item.materials.reduce(
        (s, m) => s + Number(m.cost ?? 0) * Number(m.quantity ?? 0),
        0,
      );
      const matSell = item.materials.reduce(
        (s, m) => s + Number(m.sell ?? 0) * Number(m.quantity ?? 0),
        0,
      );
      invCost += laborCost + matCost;

      // by service
      const svc = item.serviceDesc ?? "Unnamed Service";
      const existing = byService.get(svc) ?? { revenue: 0, cost: 0, count: 0 };
      byService.set(svc, {
        revenue: existing.revenue + laborCost + matSell,
        cost: existing.cost + laborCost + matCost,
        count: existing.count + 1,
      });

      // by material
      for (const m of item.materials) {
        const mc = Number(m.cost ?? 0) * Number(m.quantity ?? 0);
        const ms = Number(m.sell ?? 0) * Number(m.quantity ?? 0);
        const qty = Number(m.quantity ?? 0);
        const em = byMaterial.get(m.name) ?? {
          totalCost: 0,
          totalSell: 0,
          qty: 0,
        };
        byMaterial.set(m.name, {
          totalCost: em.totalCost + mc,
          totalSell: em.totalSell + ms,
          qty: em.qty + qty,
        });
      }
    }

    totalCost += invCost;

    // by client
    if (inv.clientId) {
      const name = inv.client
        ? `${inv.client.firstName} ${inv.client.lastName ?? ""}`.trim()
        : `Client ${inv.clientId}`;
      const ec = byClient.get(inv.clientId) ?? { name, revenue: 0, cost: 0 };
      byClient.set(inv.clientId, {
        name,
        revenue: ec.revenue + revenue,
        cost: ec.cost + invCost,
      });
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const profitMargin =
    totalRevenue > 0
      ? Math.round((totalProfit / totalRevenue) * 10000) / 100
      : 0;

  let breakdown: unknown[] | null = null;
  if (groupBy === "client") {
    breakdown = Array.from(byClient.entries())
      .map(([id, c]) => ({
        clientId: id,
        clientName: c.name,
        revenue: Math.round(c.revenue * 100) / 100,
        cost: Math.round(c.cost * 100) / 100,
        profit: Math.round((c.revenue - c.cost) * 100) / 100,
        margin:
          c.revenue > 0
            ? Math.round(((c.revenue - c.cost) / c.revenue) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  } else if (groupBy === "service") {
    breakdown = Array.from(byService.entries())
      .map(([name, s]) => ({
        service: name,
        count: s.count,
        revenue: Math.round(s.revenue * 100) / 100,
        cost: Math.round(s.cost * 100) / 100,
        profit: Math.round((s.revenue - s.cost) * 100) / 100,
      }))
      .sort((a, b) => b.profit - a.profit);
  } else if (groupBy === "material") {
    breakdown = Array.from(byMaterial.entries())
      .map(([name, m]) => ({
        material: name,
        totalCost: Math.round(m.totalCost * 100) / 100,
        totalSell: Math.round(m.totalSell * 100) / 100,
        margin: Math.round((m.totalSell - m.totalCost) * 100) / 100,
        totalQty: Math.round(m.qty * 100) / 100,
      }))
      .sort((a, b) => b.margin - a.margin);
  }

  return {
    ok: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitMargin,
      invoiceCount: invoices.length,
      breakdown,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_profit_analysis",
  description:
    "Profit and cost breakdown from delivered invoices. Returns revenue, cost, profit, and margin. Set groupBy to 'client', 'service', or 'material' for detailed breakdowns.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date YYYY-MM-DD (deliveredAt). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      clientId: {
        type: "number",
        description: "Optional — limit to one client.",
      },
      groupBy: {
        type: "string",
        enum: ["client", "service", "material", "none"],
        description:
          "Break down by client, service, or material. Default: none (totals only).",
      },
    },
    required: [],
  },
  execute,
});
