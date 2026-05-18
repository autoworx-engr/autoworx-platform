import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  clientId: z.number().int().positive(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  submodel: z.string().optional(),
  type: z.string().optional(),
  transmission: z.string().optional(),
  engineSize: z.string().optional(),
  license: z.string().optional(),
  vin: z.string().optional(),
  notes: z.string().optional(),
  other: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;

  const result = await callInternalApi({
    method: "POST",
    path: `/api/vehicle/client/${data.clientId}`,
    userId: ctx.userId,
    body: { ...data, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "create_vehicle_for_client",
  description:
    "Add a vehicle to an existing client. Use this when creating a client and they have a vehicle to register, or when an existing client has a new vehicle. You must have the client's clientId first (from get_client_by_name or from a create_client call). Provide either make + model + year, or a free-text description in 'other'. This tool is idempotent — if the same vehicle already exists for this client it returns the existing record.",
  permission: "vehicle.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "number",
        description:
          "ID of the client to attach the vehicle to (from get_client_by_name or create_client)",
      },
      make: {
        type: "string",
        description:
          "Vehicle make (e.g., 'Honda'). Required unless 'other' is provided.",
      },
      model: {
        type: "string",
        description:
          "Vehicle model (e.g., 'Civic'). Required unless 'other' is provided.",
      },
      year: {
        type: "number",
        description:
          "Vehicle year (e.g., 2020). Required unless 'other' is provided.",
      },
      submodel: {
        type: "string",
        description: "Submodel or trim (e.g., 'EX-L')",
      },
      type: {
        type: "string",
        description: "Vehicle type (e.g., 'Sedan', 'SUV')",
      },
      transmission: {
        type: "string",
        description: "Transmission type (e.g., 'Automatic')",
      },
      engineSize: {
        type: "string",
        description: "Engine size (e.g., '2.0L')",
      },
      license: {
        type: "string",
        description: "License plate number",
      },
      vin: {
        type: "string",
        description: "17-character VIN",
      },
      notes: {
        type: "string",
        description: "Any notes about the vehicle",
      },
      other: {
        type: "string",
        description:
          "Free-text vehicle description — use this instead of make/model/year when the user describes the vehicle loosely (e.g., 'their old blue truck')",
      },
    },
    required: ["clientId"],
  },
  execute,
});
