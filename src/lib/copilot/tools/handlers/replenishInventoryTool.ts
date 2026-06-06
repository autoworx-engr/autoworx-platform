import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  date: z.string().optional(),
  notes: z.string().optional(),
  vendorId: z.number().int().positive().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;
  const date = data.date ?? new Date().toISOString();

  const result = await callInternalApi({
    method: "POST",
    path: `/api/inventory/${ctx.companyId}/replenish`,
    userId: ctx.userId,
    body: { ...data, date },
  });

  if (!result.ok) {
    if (result.status === 404) {
      return {
        ok: false,
        error: `Inventory item ${data.productId} not found. Use get_inventory_item_by_name to find the correct item.`,
      };
    }
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: { productId: number; newQuantity: number; price: number };
  };
  const { productId, newQuantity, price } = payload.data;

  return {
    ok: true,
    data: {
      productId,
      newQuantity,
      costPrice: price,
      message: `Stock added. New quantity: ${newQuantity}.`,
    },
  };
}

registerTool({
  name: "replenish_inventory",
  description:
    "Adds stock to an existing inventory product. Use when the user says they received a shipment, restocked, or wants to add quantity to an item. First use get_inventory_item_by_name to confirm the item exists and get its productId, then call this tool.",
  permission: "inventory.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      productId: {
        type: "number",
        description:
          "ID of the inventory product to restock (from get_inventory_item_by_name)",
      },
      quantity: {
        type: "number",
        description:
          "Amount of stock being ADDED (not the new total — the increment)",
      },
      price: {
        type: "number",
        description: "New cost price per unit for this replenishment",
      },
      date: {
        type: "string",
        description:
          "Purchase/receipt date in ISO format. Defaults to today if omitted.",
      },
      notes: {
        type: "string",
        description: "Optional notes (e.g., PO number, lot number)",
      },
      vendorId: {
        type: "number",
        description:
          "Vendor id from get_vendor_by_name. Links this replenishment to its supplier.",
      },
    },
    required: ["productId", "quantity", "price"],
  },
  execute,
});
