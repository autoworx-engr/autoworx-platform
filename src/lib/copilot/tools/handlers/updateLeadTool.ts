import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  leadId: z.number().int().positive(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  vehicleInfo: z.string().min(1).optional(),
  services: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  comments: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { leadId, ...updateFields } = input as Input;
  const result = await callInternalApi({
    method: "PUT",
    path: `/api/lead/company/${ctx.companyId}/${leadId}`,
    userId: ctx.userId,
    body: { ...updateFields, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "update_lead",
  description:
    "Update an existing lead's details. Use when the user wants to modify client info, vehicle, services, or notes on a lead.",
  permission: "lead.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      leadId: { type: "number", description: "ID of the lead to update" },
      clientName: { type: "string", description: "Updated client name" },
      clientEmail: { type: "string", description: "Updated client email" },
      clientPhone: { type: "string", description: "Updated client phone" },
      vehicleInfo: {
        type: "string",
        description: "Updated vehicle description",
      },
      services: {
        type: "string",
        description: "Updated services requested",
      },
      source: { type: "string", description: "Updated lead source" },
      comments: {
        type: "string",
        description: "Additional comments or notes",
      },
    },
    required: ["leadId"],
  },
  execute,
});
