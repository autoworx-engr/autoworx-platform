import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";
import { Priority } from "@prisma/client";

const inputSchema = z.object({
  taskId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  date: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  assignedUsers: z.array(z.number().int().positive()).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { taskId, ...updateFields } = input as Input;
  const result = await callInternalApi({
    method: "PUT",
    path: `/api/task/company/${ctx.companyId}/${taskId}`,
    userId: ctx.userId,
    body: { ...updateFields, userId: ctx.userId },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "update_task",
  description:
    "Update an existing task's title, priority, due date, or assigned users. Use when the user wants to modify a task.",
  permission: "task.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      taskId: { type: "number", description: "ID of the task to update" },
      title: { type: "string", description: "Updated task title" },
      description: {
        type: "string",
        description: "Updated task description",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
        description: "Updated priority",
      },
      date: {
        type: "string",
        description: "Updated due date in ISO format",
      },
      startTime: {
        type: "string",
        description: "Updated start time (HH:MM)",
      },
      endTime: { type: "string", description: "Updated end time (HH:MM)" },
      clientId: { type: "number", description: "Updated client ID" },
      assignedUsers: {
        type: "array",
        items: { type: "number" },
        description: "Updated list of assigned user IDs",
      },
    },
    required: ["taskId"],
  },
  execute,
});
