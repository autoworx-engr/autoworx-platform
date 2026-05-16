import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  vehicleInfo: z.string().min(1),
  services: z.string().min(1),
  source: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;
  const result = await callInternalApi({
    method: "POST",
    path: `/api/lead/company/${ctx.companyId}`,
    userId: ctx.userId,
    body: { ...data, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "create_lead",
  description:
    "Create a new lead for a prospective client. Use when the user wants to add a new potential customer to the sales pipeline.",
  permission: "lead.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientName: {
        type: "string",
        description: "Full name of the prospective client",
      },
      clientEmail: {
        type: "string",
        description: "Client email address (optional)",
      },
      clientPhone: {
        type: "string",
        description: "Client phone number (optional)",
      },
      vehicleInfo: {
        type: "string",
        description: "Vehicle description (e.g., '2020 Honda Civic')",
      },
      services: {
        type: "string",
        description:
          "Requested services (e.g., 'Oil Change, Brake Inspection')",
      },
      source: {
        type: "string",
        description: "Lead source (e.g., 'Website', 'Phone', 'Walk-in')",
      },
    },
    required: ["clientName", "vehicleInfo", "services", "source"],
  },
  execute,
});
