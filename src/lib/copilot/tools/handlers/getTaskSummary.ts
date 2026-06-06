import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.number().int().positive().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, userId, priority } = input as Input;

  const tasks = await db.task.findMany({
    where: {
      companyId: ctx.companyId,
      ...(priority ? { priority } : {}),
      ...(userId
        ? {
            OR: [{ userId }, { taskUser: { some: { userId } } }],
          }
        : {}),
      ...(startDate && endDate
        ? {
            date: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: { id: true, priority: true, date: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byPriority = { low: 0, medium: 0, high: 0 };
  let overdue = 0;

  for (const t of tasks) {
    if (t.priority === "Low") byPriority.low++;
    else if (t.priority === "Medium") byPriority.medium++;
    else if (t.priority === "High") byPriority.high++;

    if (t.date && new Date(t.date) < today) overdue++;
  }

  return {
    ok: true,
    data: {
      total: tasks.length,
      overdue,
      byPriority,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_task_summary",
  description:
    "Task summary — total count, overdue tasks (date < today), and breakdown by priority (Low/Medium/High). Optionally filter by user or priority. Date filter uses Task.date.",
  permission: "task.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (filters by Task.date). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      userId: {
        type: "number",
        description: "Optional — filter to tasks assigned to one user.",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
        description: "Optional — filter to one priority level.",
      },
    },
    required: [],
  },
  execute,
});
