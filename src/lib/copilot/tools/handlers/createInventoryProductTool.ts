import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["Product", "Supply"]),
  quantity: z.number().nonnegative(),
  price: z.number().nonnegative(),
  unit: z.string().max(5).optional(),
  description: z.string().optional(),
  lowInventoryAlert: z.number().int().nonnegative().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;

  const result = await callInternalApi({
    method: "POST",
    path: `/api/inventory/${ctx.companyId}/products`,
    userId: ctx.userId,
    body: data,
  });

  if (!result.ok) {
    if (result.status === 409) {
      return {
        ok: false,
        error: `An inventory item named '${data.name}' already exists. Use get_inventory_item_by_name to find it.`,
      };
    }
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: {
      productId: number;
      name: string;
      type: string;
      quantity: number;
      price: number;
      unit: string;
    };
  };
  const { productId, name, type, quantity, price, unit } = payload.data;

  return {
    ok: true,
    data: {
      productId,
      name,
      type,
      quantity,
      costPrice: price,
      unit,
      message: `Inventory item created (id ${productId}).`,
    },
  };
}

registerTool({
  name: "create_inventory_product",
  description:
    "Creates a new inventory product for the shop. Use when the user wants to add a brand-new item to their inventory catalog. Before calling this, check with get_inventory_item_by_name to confirm the item does not already exist.",
  permission: "inventory.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description:
          "Product name (min 3 characters, must be unique for this company)",
      },
      type: {
        type: "string",
        enum: ["Product", "Supply"],
        description:
          "'Product' for resale items, 'Supply' for consumable shop supplies",
      },
      quantity: {
        type: "number",
        description: "Initial stock quantity (0 or more)",
      },
      price: {
        type: "number",
        description:
          "Cost price per unit — the shop's acquisition cost, NOT the customer sell price",
      },
      unit: {
        type: "string",
        description:
          "Unit of measure (max 5 chars, e.g. 'pc', 'ft', 'oz', 'gal'). Defaults to 'pc'.",
      },
      description: {
        type: "string",
        description: "Optional product description",
      },
      lowInventoryAlert: {
        type: "number",
        description: "Alert threshold — must be less than quantity. Optional.",
      },
    },
    required: ["name", "type", "quantity", "price"],
  },
  execute,
});
