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

  const parts = searchTerm.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, error: "Search term cannot be empty." };
  }

  const clients = await db.client.findMany({
    where: {
      companyId: ctx.companyId,
      AND: parts.map((part) => ({
        OR: [
          { firstName: { contains: part, mode: "insensitive" as const } },
          { lastName: { contains: part, mode: "insensitive" as const } },
          { email: { contains: part, mode: "insensitive" as const } },
        ],
      })),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      Lead: {
        select: {
          id: true,
          clientName: true,
          vehicleInfo: true,
          services: true,
          source: true,
          createdAt: true,
        },
      },
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
      lead: c.Lead
        ? {
            id: c.Lead.id,
            clientName: c.Lead.clientName,
            vehicleInfo: c.Lead.vehicleInfo,
            services: c.Lead.services,
            source: c.Lead.source,
            createdAt: c.Lead.createdAt,
          }
        : null,
    })),
  };
}

registerTool({
  name: "get_client_by_name",
  description:
    "Search for clients by name (fuzzy, handles full names like 'Jane Smith'). Use when the user mentions a client name and you need their ID or lead ID for another operation. Returns top 5 matches, each with their associated lead (if any).",
  permission: "client.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description:
          "Client name or email to search (min 2 characters). Can be a full name like 'Jane Smith' — parts are matched individually.",
      },
    },
    required: ["searchTerm"],
  },
  execute,
});
