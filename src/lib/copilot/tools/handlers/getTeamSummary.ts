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
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, userId } = input as Input;

  const users = await db.user.findMany({
    where: {
      companyId: ctx.companyId,
      ...(userId ? { id: userId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeType: true,
      Technician: {
        where: {
          status: "Complete",
          ...(startDate && endDate
            ? {
                dateClosed: {
                  gte: new Date(`${startDate}T00:00:00.000Z`),
                  lte: new Date(`${endDate}T23:59:59.999Z`),
                },
              }
            : {}),
        },
        select: { amount: true, dateClosed: true },
      },
    },
  });

  const members = users.map((u) => {
    const totalPayout = u.Technician.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0,
    );
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName ?? ""}`.trim(),
      role: u.employeeType,
      completedJobs: u.Technician.length,
      totalPayout: Math.round(totalPayout * 100) / 100,
    };
  });

  const totalPayout = members.reduce((sum, m) => sum + m.totalPayout, 0);

  return {
    ok: true,
    data: {
      members,
      totalPayout: Math.round(totalPayout * 100) / 100,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_team_summary",
  description:
    "Returns team performance — completed job counts and payouts per team member. Date filter uses Technician.dateClosed. Use when the user asks about team performance, technician payouts, or jobs completed.",
  permission: "team.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date in YYYY-MM-DD format (filters by Technician.dateClosed). Omit for all-time.",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format.",
      },
      userId: {
        type: "number",
        description:
          "Optional — filter to a single team member by their user id.",
      },
    },
    required: [],
  },
  execute,
});
