import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  clientId: z.number().int().positive(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { clientId } = input as Input;

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: ctx.companyId },
    select: { id: true },
  });

  if (!client) {
    return {
      ok: false,
      error: `Client ${clientId} not found in your company.`,
    };
  }

  const vehicles = await db.vehicle.findMany({
    where: { clientId, companyId: ctx.companyId },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      other: true,
      vin: true,
      license: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    ok: true,
    data: vehicles.map((v) => ({
      id: v.id,
      year: v.year ? String(v.year) : null,
      make: v.make ?? null,
      model: v.model ?? null,
      other: v.other ?? null,
      vin: v.vin ?? null,
      licensePlate: v.license ?? null,
    })),
  };
}

registerTool({
  name: "get_vehicle_by_client",
  description:
    "List all vehicles for a client by their client ID, including VIN, license plate, and full vehicle details. Note: get_client_by_name already returns vehicle IDs alongside descriptions — prefer using those directly when creating estimates, to avoid clientId drift across turns. Use this tool only when you need vehicle details beyond what get_client_by_name provides (e.g. VIN, license plate, or 'other' description).",
  permission: "client.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "number",
        description: "The numeric client ID (from get_client_by_name)",
      },
    },
    required: ["clientId"],
  },
  execute,
});
