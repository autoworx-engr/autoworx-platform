import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  searchTerm: z.string().min(1),
  type: z.enum(["Product", "Supply"]).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { searchTerm, type } = input as Input;

  const parts = searchTerm.trim().split(/\s+/).filter(Boolean);

  const items = await db.inventoryProduct.findMany({
    where: {
      companyId: ctx.companyId,
      AND: parts.map((word) => ({
        name: { contains: word, mode: "insensitive" as const },
      })),
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      quantity: true,
      price: true,
      unit: true,
      lowInventoryAlert: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  if (items.length === 0) {
    return {
      ok: false,
      error: `No inventory items found matching '${searchTerm}'.`,
    };
  }

  return {
    ok: true,
    data: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      type: item.type,
      quantity: Number(item.quantity ?? 0),
      costPrice: Number(item.price ?? 0),
      unit: item.unit ?? "pc",
      lowInventoryAlert: item.lowInventoryAlert ?? null,
    })),
  };
}

registerTool({
  name: "get_inventory_item_by_name",
  description:
    "Search inventory items by keywords — all words must appear in the product name, in any order. Returns each item's id, name, current stock quantity, unit, and costPrice (the shop's acquisition cost — NOT the customer sell price). The sell price must always be gathered from the user separately. Use when the user names a material that might be in stock, or when they ask about inventory levels.",
  permission: "inventory.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description:
          "One or more keywords to search by. All words must appear in the product name (any order). Example: 'gloss black' finds '3M High Gloss Black Vinyl'.",
      },
      type: {
        type: "string",
        enum: ["Product", "Supply"],
        description: "Optional filter by inventory type",
      },
    },
    required: ["searchTerm"],
  },
  execute,
});
