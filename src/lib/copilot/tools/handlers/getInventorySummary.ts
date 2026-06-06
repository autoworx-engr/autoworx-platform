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
  lowStockOnly: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, lowStockOnly } = input as Input;

  const [products, history] = await Promise.all([
    db.inventoryProduct.findMany({
      where: { companyId: ctx.companyId },
      select: {
        id: true,
        name: true,
        type: true,
        quantity: true,
        price: true,
        unit: true,
        lowInventoryAlert: true,
      },
      orderBy: { name: "asc" },
    }),
    db.inventoryProductHistory.findMany({
      where: {
        companyId: ctx.companyId,
        type: "Purchase",
        ...(startDate && endDate
          ? {
              date: {
                gte: new Date(`${startDate}T00:00:00.000Z`),
                lte: new Date(`${endDate}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      include: { product: { select: { type: true } } },
    }),
  ]);

  // Low-stock items (quantity <= alert threshold)
  const allLowStock = products.filter(
    (p) =>
      p.lowInventoryAlert !== null &&
      Number(p.quantity ?? 0) <= Number(p.lowInventoryAlert),
  );

  const displayedProducts = lowStockOnly ? allLowStock : products;

  const productItems = displayedProducts.filter((p) => p.type === "Product");
  const supplyItems = displayedProducts.filter((p) => p.type === "Supply");

  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.quantity ?? 0) * Number(p.price ?? 0),
    0,
  );

  const purchaseValueProducts = history
    .filter((h) => h.product.type === "Product")
    .reduce(
      (sum, h) => sum + Number(h.quantity ?? 0) * Number(h.price ?? 0),
      0,
    );

  const purchaseValueSupplies = history
    .filter((h) => h.product.type === "Supply")
    .reduce(
      (sum, h) => sum + Number(h.quantity ?? 0) * Number(h.price ?? 0),
      0,
    );

  return {
    ok: true,
    data: {
      totalProducts: productItems.length,
      totalSupplies: supplyItems.length,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      purchaseValueProducts: Math.round(purchaseValueProducts * 100) / 100,
      purchaseValueSupplies: Math.round(purchaseValueSupplies * 100) / 100,
      lowStockItems: allLowStock.map((p) => ({
        id: p.id,
        name: p.name,
        quantity: Number(p.quantity ?? 0),
        unit: p.unit ?? "pc",
        alertThreshold: Number(p.lowInventoryAlert),
      })),
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_inventory_summary",
  description:
    "Returns inventory summary — current stock levels, total stock value, purchase value by type (Product/Supply), and low-stock items. Date filter on purchase history uses InventoryProductHistory.date.",
  permission: "inventory.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date in YYYY-MM-DD format — filters purchase history. Omit for all-time.",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format.",
      },
      lowStockOnly: {
        type: "boolean",
        description:
          "If true, counts only items at or below their low-stock alert threshold.",
      },
    },
    required: [],
  },
  execute,
});
