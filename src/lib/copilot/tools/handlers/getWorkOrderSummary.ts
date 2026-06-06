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
  status: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, userId, status } = input as Input;

  const workOrders = await db.invoice.findMany({
    where: {
      companyId: ctx.companyId,
      isWorkOrder: true,
      ...(userId ? { assignedToId: userId } : {}),
      ...(status ? { column: { title: status } } : {}),
      ...(startDate && endDate
        ? {
            workOrderCreatedAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: {
      id: true,
      workOrderCreatedAt: true,
      completedAt: true,
      deliveredAt: true,
      column: { select: { title: true } },
    },
  });

  const byStatus = {
    inProgress: 0,
    completed: 0,
    delivered: 0,
    reDos: 0,
    cancelled: 0,
    pending: 0,
  };

  let totalCompletionMs = 0;
  let completedWithTime = 0;

  for (const wo of workOrders) {
    const title = wo.column?.title ?? "";
    if (title === "In Progress") byStatus.inProgress++;
    else if (title === "Completed") byStatus.completed++;
    else if (title === "Delivered") byStatus.delivered++;
    else if (title === "Re-Dos") byStatus.reDos++;
    else if (title === "Cancelled") byStatus.cancelled++;
    else if (title === "Pending") byStatus.pending++;

    // Avg completion time: workOrderCreatedAt → completedAt or deliveredAt
    const end = wo.completedAt ?? wo.deliveredAt;
    if (wo.workOrderCreatedAt && end) {
      totalCompletionMs +=
        new Date(end).getTime() - new Date(wo.workOrderCreatedAt).getTime();
      completedWithTime++;
    }
  }

  const avgCompletionHours =
    completedWithTime > 0
      ? Math.round((totalCompletionMs / completedWithTime / 3600000) * 100) /
        100
      : null;

  return {
    ok: true,
    data: {
      total: workOrders.length,
      byStatus,
      avgCompletionHours,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_work_order_summary",
  description:
    "Work order status summary — count by pipeline stage (In Progress, Completed, Delivered, Re-Dos, Cancelled), and average completion time in hours. Date filter uses Invoice.workOrderCreatedAt.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (filters by workOrderCreatedAt). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      userId: {
        type: "number",
        description: "Optional — filter to work orders assigned to one user.",
      },
      status: {
        type: "string",
        description:
          "Optional — filter by pipeline status: 'In Progress', 'Completed', 'Delivered', 'Re-Dos', 'Cancelled', 'Pending'.",
      },
    },
    required: [],
  },
  execute,
});
