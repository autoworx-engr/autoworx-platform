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

  const items = await db.inventoryProduct.findMany({
    where: {
      companyId: ctx.companyId,
      name: { contains: searchTerm, mode: "insensitive" },
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      name: true,
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
      type: item.type,
      quantity: Number(item.quantity ?? 0),
      price: Number(item.price ?? 0),
      unit: item.unit ?? "pc",
      lowInventoryAlert: item.lowInventoryAlert ?? null,
    })),
  };
}

registerTool({
  name: "get_inventory_item_by_name",
  description:
    "Search inventory items by name. Use when the user asks about stock, inventory, parts, or supplies.",
  permission: "inventory.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description: "Item name to search (partial match)",
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
