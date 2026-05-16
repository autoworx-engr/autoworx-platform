import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";
import { Priority } from "@prisma/client";

const inputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default("Medium"),
  date: z.string().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).default([]),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;
  const assignedUsers =
    data.assignedUsers.length > 0 ? data.assignedUsers : [ctx.userId];

  const result = await callInternalApi({
    method: "POST",
    path: `/api/task/company/${ctx.companyId}`,
    userId: ctx.userId,
    body: { ...data, assignedUsers, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "create_task",
  description:
    "Create a new task and assign it to staff. Use when the user wants to add a to-do item, follow-up, or work order task.",
  permission: "task.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Task title" },
      description: {
        type: "string",
        description: "Optional task description or notes",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
        description: "Task priority (default: MEDIUM)",
      },
      date: {
        type: "string",
        description: "Due date in ISO format (YYYY-MM-DDThh:mm:ss.000Z)",
      },
      startTime: {
        type: "string",
        description: "Start time (HH:MM format)",
      },
      endTime: { type: "string", description: "End time (HH:MM format)" },
      clientId: {
        type: "number",
        description: "Client ID to link task to (optional)",
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
