import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  assignedUserId: z.number().int().positive().optional(),
  status: z.enum(["pending", "completed", "all"]).default("pending"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  take: z.number().int().min(1).max(50).default(20),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { assignedUserId, status, startDate, endDate, take } = input as Input;

  // Non-admin users can only see their own tasks
  const isAdmin = ctx.userRole === "Admin";
  const targetUserId = isAdmin && assignedUserId ? assignedUserId : ctx.userId;

  const dateFilter =
    startDate || endDate
      ? {
          date: {
            ...(startDate
              ? { gte: new Date(`${startDate}T00:00:00.000Z`) }
              : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {};

  const tasks = await db.task.findMany({
    where: {
      companyId: ctx.companyId,
      taskUser: { some: { userId: targetUserId } },
      ...dateFilter,
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      date: true,
      startTime: true,
      endTime: true,
      taskUser: {
        select: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    take,
    orderBy: { date: "asc" },
  });

  // Task model has no `completed` boolean — filter by checking if date is past
  // The spec asks for completed/pending filtering; we use date as a proxy
  const now = new Date();
  const filtered = tasks.filter((t) => {
    if (status === "all") return true;
    const isPast = t.date ? t.date < now : false;
    return status === "completed" ? isPast : !isPast;
  });

  return {
    ok: true,
    data: filtered.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      priority: t.priority,
      date: t.date ? t.date.toISOString().slice(0, 10) : null,
      startTime: t.startTime ?? null,
      endTime: t.endTime ?? null,
      completed: t.date ? t.date < now : false,
      assignedUsers: t.taskUser
        .filter((tu) => tu.user)
        .map((tu) => ({
          id: tu.user!.id,
          name:
            `${tu.user!.firstName} ${tu.user!.lastName ?? ""}`.trim() ||
            "Unknown",
        })),
    })),
  };
}

registerTool({
  name: "get_tasks_for_user",
  description:
    "List tasks assigned to the current user or a specific user (Admin only). Use when the user asks about their to-do list, pending tasks, or what's due.",
  permission: "task.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      assignedUserId: {
        type: "number",
        description: "User ID to filter tasks (Admin only; defaults to self)",
      },
      status: {
        type: "string",
        enum: ["pending", "completed", "all"],
        description: "Filter by task status (default: pending)",
      },
      startDate: {
        type: "string",
        description: "Optional start date filter (YYYY-MM-DD)",
      },
      endDate: {
        type: "string",
        description: "Optional end date filter (YYYY-MM-DD)",
      },
      take: {
        type: "number",
        description: "Max results to return (1–50, default 20)",
      },
    },
    required: [],
  },
  execute,
});
