import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters"),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { searchTerm } = input as Input;
  const clients = await db.client.findMany({
    where: {
      companyId: ctx.companyId,
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      Vehicle: { select: { id: true }, take: 1 },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  if (clients.length === 0) {
    return {
      ok: false,
      error: `No client found matching '${searchTerm}' in your company.`,
    };
  }

  return {
    ok: true,
    data: clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName ?? null,
      email: c.email ?? null,
      phone: c.mobile ?? null,
      hasVehicles: c.Vehicle.length > 0,
    })),
  };
}

registerTool({
  name: "get_client_by_name",
  description:
    "Search for clients by name (fuzzy). Use when the user mentions a client name and you need their ID for another operation. Returns top 5 matches.",
  permission: "client.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description: "Client name or email to search (min 2 characters)",
      },
    },
    required: ["searchTerm"],
  },
  execute,
});
