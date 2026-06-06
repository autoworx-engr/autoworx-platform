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

  const items = await db.invoiceItem.findMany({
    where: {
      invoice: {
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
    },
    select: {
      serviceDesc: true,
      labor: { select: { charge: true, hours: true } },
      materials: { select: { sell: true, cost: true, quantity: true } },
    },
  });

  const byService = new Map<
    string,
    {
      count: number;
      laborRevenue: number;
      materialRevenue: number;
      materialCost: number;
      totalLaborCharge: number;
      totalHours: number;
      laborEntries: number;
    }
  >();

  for (const item of items) {
    const name = item.serviceDesc ?? "General Service";
    const laborRevenue =
      Number(item.labor?.charge ?? 0) * Number(item.labor?.hours ?? 0);
    const matRevenue = item.materials.reduce(
      (s, m) => s + Number(m.sell ?? 0) * Number(m.quantity ?? 0),
      0,
    );
    const matCost = item.materials.reduce(
      (s, m) => s + Number(m.cost ?? 0) * Number(m.quantity ?? 0),
      0,
    );

    const es = byService.get(name) ?? {
      count: 0,
      laborRevenue: 0,
      materialRevenue: 0,
      materialCost: 0,
      totalLaborCharge: 0,
      totalHours: 0,
      laborEntries: 0,
    };

    byService.set(name, {
      count: es.count + 1,
      laborRevenue: es.laborRevenue + laborRevenue,
      materialRevenue: es.materialRevenue + matRevenue,
      materialCost: es.materialCost + matCost,
      totalLaborCharge: es.totalLaborCharge + Number(item.labor?.charge ?? 0),
      totalHours: es.totalHours + Number(item.labor?.hours ?? 0),
      laborEntries: es.laborEntries + (item.labor ? 1 : 0),
    });
  }

  const services = Array.from(byService.entries())
    .map(([name, s]) => ({
      name,
      count: s.count,
      totalRevenue:
        Math.round((s.laborRevenue + s.materialRevenue) * 100) / 100,
      totalLaborRevenue: Math.round(s.laborRevenue * 100) / 100,
      totalMaterialRevenue: Math.round(s.materialRevenue * 100) / 100,
      materialMargin:
        Math.round((s.materialRevenue - s.materialCost) * 100) / 100,
      avgLaborRate:
        s.laborEntries > 0
          ? Math.round((s.totalLaborCharge / s.laborEntries) * 100) / 100
          : 0,
      avgHours:
        s.laborEntries > 0
          ? Math.round((s.totalHours / s.laborEntries) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    ok: true,
    data: {
      services,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_service_performance",
  description:
    "Service performance analytics — most popular services, revenue per service, average labor rate, and average job duration. Based on delivered invoice line items.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (Invoice.deliveredAt). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
    },
    required: [],
  },
  execute,
});
