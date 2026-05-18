import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  clientId: z.number().int().positive(),
  type: z.enum(["Estimate", "Invoice"]).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { clientId, type } = input as Input;

  const where: Record<string, unknown> = { companyId: ctx.companyId, clientId };
  if (type) where.type = type;

  const records = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      grandTotal: true,
      createdAt: true,
      vehicle: { select: { id: true, year: true, make: true, model: true } },
      column: { select: { title: true } },
    },
  });

  if (records.length === 0) {
    const label = type ? type.toLowerCase() + "s" : "estimates or invoices";
    return {
      ok: true,
      data: { items: [], message: `No ${label} found for this client.` },
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const items = records.map((r) => {
    const v = r.vehicle;
    const vehicleInfo = v
      ? [v.year, v.make, v.model].filter(Boolean).join(" ") || null
      : null;
    return {
      id: r.id,
      type: r.type,
      status: r.column?.title ?? null,
      grandTotal: Number(r.grandTotal ?? 0),
      vehicleId: v?.id ?? null,
      vehicleInfo,
      publicLink: `${appUrl}/public-invoice/${r.id}`,
      editLink: `/dashboard/estimate/edit/${r.id}`,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return { ok: true, data: { items } };
}

registerTool({
  name: "get_estimates_for_client",
  description:
    "List estimates and/or invoices for a specific client (up to 20 most recent). Use when the user asks about a client's estimates in general. Each result includes id, type, status, grandTotal, vehicleId, vehicle description, publicLink (client-facing digital link), editLink, and createdAt. Resolve the client with get_client_by_name first, then call this with their clientId.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "number",
        description: "The numeric client ID to look up estimates for.",
      },
      type: {
        type: "string",
        enum: ["Estimate", "Invoice"],
        description:
          "Optional filter — omit to return both estimates and invoices.",
      },
    },
    required: ["clientId"],
  },
  execute,
});
