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

function phoneLast4(mobile: string | null | undefined): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

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
      Vehicle: {
        select: { id: true, year: true, make: true, model: true },
        take: 5,
      },
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
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (clients.length === 0) {
    return {
      ok: true,
      data: {
        matchCount: 0,
        clients: [],
      },
    };
  }

  return {
    ok: true,
    data: {
      matchCount: clients.length,
      clients: clients.map((c) => {
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
        const vehicles = c.Vehicle.map((v) => ({
          id: v.id,
          description: [v.year, v.make, v.model].filter(Boolean).join(" "),
        }));

        return {
          id: c.id,
          name,
          firstName: c.firstName,
          lastName: c.lastName ?? null,
          email: c.email ?? null,
          phoneLast4: phoneLast4(c.mobile),
          vehicles,
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
        };
      }),
    },
  };
}

registerTool({
  name: "get_client_by_name",
  description:
    "Search for clients by name (fuzzy, handles full names like 'Jane Smith'). Returns all matches (up to 10) with disambiguating detail: matchCount, each client's id, name, phoneLast4, email, vehicles, and associated lead. Each vehicle includes its id and description (year make model) — use the vehicle id directly when creating estimates. Do NOT call get_vehicle_by_client separately after this tool; doing so risks clientId drift and cross-client data contamination. Check matchCount — if 1, use it; if >1, ask the user which; if 0, offer to create a new client.",
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
