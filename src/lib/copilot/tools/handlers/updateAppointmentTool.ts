import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  appointmentId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  vehicleId: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { appointmentId, ...updateFields } = input as Input;
  const result = await callInternalApi({
    method: "PATCH",
    path: `/api/appointment/company/${ctx.companyId}/${appointmentId}`,
    userId: ctx.userId,
    body: { ...updateFields, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "update_appointment",
  description:
    "Update an existing appointment's details, time, or assigned staff. Use when the user wants to reschedule or modify an appointment.",
  permission: "appointment.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      appointmentId: {
        type: "number",
        description: "ID of the appointment to update",
      },
      title: { type: "string", description: "Updated appointment title" },
      date: { type: "string", description: "Updated date in ISO format" },
      startTime: {
        type: "string",
        description: "Updated start time (HH:MM)",
      },
      endTime: { type: "string", description: "Updated end time (HH:MM)" },
      clientId: { type: "number", description: "Updated client ID" },
      vehicleId: { type: "number", description: "Updated vehicle ID" },
      notes: { type: "string", description: "Updated notes" },
      assignedUsers: {
        type: "array",
        items: { type: "number" },
        description: "Updated list of assigned user IDs",
      },
    },
    required: ["appointmentId"],
  },
  execute,
});
