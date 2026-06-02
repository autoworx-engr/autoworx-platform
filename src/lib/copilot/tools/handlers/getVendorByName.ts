import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  searchTerm: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { searchTerm } = input as Input;

  const words = searchTerm.trim().split(/\s+/).filter(Boolean);

  const vendors = await db.vendor.findMany({
    where: {
      companyId: ctx.companyId,
      AND: words.map((word) => ({
        OR: [
          { companyName: { contains: word, mode: "insensitive" as const } },
          { name: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
    select: {
      id: true,
      companyName: true,
      name: true,
      email: true,
      phone: true,
    },
    take: 10,
    orderBy: { companyName: "asc" },
  });

  if (vendors.length === 0) {
    return {
      ok: false,
      error: `No vendors found matching '${searchTerm}'.`,
    };
  }

  return {
    ok: true,
    data: {
      matchCount: vendors.length,
      vendors: vendors.map((v) => ({
        id: v.id,
        companyName: v.companyName,
        name: v.name ?? null,
        email: v.email ?? null,
        phone: v.phone ?? null,
      })),
    },
  };
}

registerTool({
  name: "get_vendor_by_name",
  description:
    "Search vendors by name — all keywords must appear in the vendor's companyName or display name, in any order. Use before creating inventory items or replenishing stock to find or confirm the vendor's id.",
  permission: "inventory.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description:
          "One or more keywords. All must appear in either the vendor's companyName or display name (any order). Example: '3M' finds '3M Company'.",
      },
    },
    required: ["searchTerm"],
  },
  execute,
});
