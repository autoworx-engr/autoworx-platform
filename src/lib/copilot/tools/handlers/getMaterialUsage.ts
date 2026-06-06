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
  vendorId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  groupBy: z.enum(["material", "vendor", "none"]).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const {
    startDate,
    endDate,
    vendorId,
    productId,
    groupBy = "none",
  } = input as Input;

  const materials = await db.material.findMany({
    where: {
      companyId: ctx.companyId,
      ...(vendorId ? { vendorId } : {}),
      ...(productId ? { productId } : {}),
      ...(startDate && endDate
        ? {
            createdAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: {
      name: true,
      cost: true,
      sell: true,
      quantity: true,
      vendor: { select: { id: true, companyName: true } },
      product: { select: { id: true, name: true } },
    },
  });

  let totalMaterialCost = 0;
  let totalMaterialSell = 0;

  const byMaterial = new Map<
    string,
    { totalCost: number; totalSell: number; qty: number; count: number }
  >();
  const byVendor = new Map<
    number,
    { name: string; totalSpend: number; count: number }
  >();

  for (const m of materials) {
    const qty = Number(m.quantity ?? 0);
    const cost = Number(m.cost ?? 0) * qty;
    const sell = Number(m.sell ?? 0) * qty;

    totalMaterialCost += cost;
    totalMaterialSell += sell;

    // by material name
    const em = byMaterial.get(m.name) ?? {
      totalCost: 0,
      totalSell: 0,
      qty: 0,
      count: 0,
    };
    byMaterial.set(m.name, {
      totalCost: em.totalCost + cost,
      totalSell: em.totalSell + sell,
      qty: em.qty + qty,
      count: em.count + 1,
    });

    // by vendor
    if (m.vendor) {
      const vid = m.vendor.id;
      const ev = byVendor.get(vid) ?? {
        name: m.vendor.companyName,
        totalSpend: 0,
        count: 0,
      };
      byVendor.set(vid, {
        name: m.vendor.companyName,
        totalSpend: ev.totalSpend + cost,
        count: ev.count + 1,
      });
    }
  }

  const totalMargin = totalMaterialSell - totalMaterialCost;

  let breakdown: unknown[] | null = null;
  if (groupBy === "material") {
    breakdown = Array.from(byMaterial.entries())
      .map(([name, d]) => ({
        name,
        totalCost: Math.round(d.totalCost * 100) / 100,
        totalSell: Math.round(d.totalSell * 100) / 100,
        margin: Math.round((d.totalSell - d.totalCost) * 100) / 100,
        totalQty: Math.round(d.qty * 100) / 100,
        avgCostPerUnit:
          d.qty > 0 ? Math.round((d.totalCost / d.qty) * 100) / 100 : 0,
        avgSellPerUnit:
          d.qty > 0 ? Math.round((d.totalSell / d.qty) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  } else if (groupBy === "vendor") {
    breakdown = Array.from(byVendor.entries())
      .map(([id, v]) => ({
        vendorId: id,
        vendorName: v.name,
        totalSpend: Math.round(v.totalSpend * 100) / 100,
        materialCount: v.count,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }

  return {
    ok: true,
    data: {
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      totalMaterialSell: Math.round(totalMaterialSell * 100) / 100,
      totalMargin: Math.round(totalMargin * 100) / 100,
      materialCount: materials.length,
      breakdown,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_material_usage",
  description:
    "Material usage analytics — total cost, sell, and margin. Filter by vendor or product. GroupBy 'material' for per-material breakdown, 'vendor' for supplier spending.",
  permission: "inventory.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (Material.createdAt). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      vendorId: {
        type: "number",
        description: "Optional — filter to one vendor.",
      },
      productId: {
        type: "number",
        description: "Optional — filter to one inventory product.",
      },
      groupBy: {
        type: "string",
        enum: ["material", "vendor", "none"],
        description:
          "Break down by material name or vendor. Default: none (totals only).",
      },
    },
    required: [],
  },
  execute,
});
