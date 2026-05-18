import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  title: z.string().min(1),
  date: z.string().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  vehicleId: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).default([]),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;
  const assignedUsers =
    data.assignedUsers.length > 0 ? data.assignedUsers : [ctx.userId];

  const result = await callInternalApi({
    method: "POST",
    path: `/api/appointment/company/${ctx.companyId}`,
    userId: ctx.userId,
    body: { ...data, assignedUsers, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "create_appointment",
  description:
    "Schedule a new appointment for an EXISTING client. Before calling this, you MUST obtain the client's clientId by calling get_client_by_name — do NOT call create_lead to get client information. Creating a lead and scheduling an appointment are completely separate operations; an appointment does not require a new lead. If get_client_by_name returns no match, ask the user to clarify the client's name — do not create anything.",
  permission: "appointment.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "Appointment title (e.g., 'Oil Change')",
      },
      date: {
        type: "string",
        description:
          "Appointment date in ISO format (YYYY-MM-DDThh:mm:ss.000Z)",
      },
      startTime: {
        type: "string",
        description: "Start time (HH:MM format, e.g., '09:00')",
      },
      endTime: {
        type: "string",
        description: "End time (HH:MM format, e.g., '10:00')",
      },
      clientId: {
        type: "number",
        description: "Client ID (use get_client_by_name to find)",
      },
      vehicleId: {
        type: "number",
        description: "Vehicle ID (use get_vehicle_by_client to find)",
      },
      notes: {
        type: "string",
        description: "Optional notes for the appointment",
      },
      assignedUsers: {
        type: "array",
        items: { type: "number" },
        description: "User IDs to assign (defaults to current user)",
      },
    },
    required: ["title"],
  },
  execute,
});
