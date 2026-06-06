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
  includeHours: z.boolean().optional(),
  includeRedos: z.boolean().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, userId, includeHours, includeRedos } =
    input as Input;

  const clockDateFilter =
    startDate && endDate
      ? {
          clockIn: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T23:59:59.999Z`),
          },
        }
      : {};

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
        select: { id: true, amount: true },
      },
      ...(includeHours
        ? {
            ClockInOut: {
              where: clockDateFilter,
              select: { clockIn: true, clockOut: true },
            },
          }
        : {}),
    },
  });

  // Redo counts — one query for all users, filter per user in JS
  let redosByUser: Map<number, number> = new Map();
  if (includeRedos) {
    const redos = await db.invoiceRedo.findMany({
      where: {
        invoice: { companyId: ctx.companyId },
        ...(userId ? { technician: { userId } } : {}),
      },
      select: { technician: { select: { userId: true } } },
    });
    for (const r of redos) {
      const uid = r.technician.userId;
      redosByUser.set(uid, (redosByUser.get(uid) ?? 0) + 1);
    }
  }

  const members = users.map((u) => {
    const totalPayout = u.Technician.reduce(
      (sum, t) => sum + Number(t.amount ?? 0),
      0,
    );
    const completedJobs = u.Technician.length;

    let hoursWorked: number | null = null;
    if (includeHours && (u as any).ClockInOut) {
      const ms = (u as any).ClockInOut.reduce((sum: number, c: any) => {
        if (!c.clockOut) return sum;
        return (
          sum + (new Date(c.clockOut).getTime() - new Date(c.clockIn).getTime())
        );
      }, 0);
      hoursWorked = Math.round((ms / 3600000) * 100) / 100;
    }

    const redoCount = includeRedos ? (redosByUser.get(u.id) ?? 0) : null;
    const redoRate =
      includeRedos && completedJobs > 0
        ? Math.round(((redoCount ?? 0) / completedJobs) * 10000) / 100
        : null;

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName ?? ""}`.trim(),
      role: u.employeeType,
      completedJobs,
      totalPayout: Math.round(totalPayout * 100) / 100,
      ...(includeHours ? { hoursWorked } : {}),
      ...(includeRedos ? { redoCount, redoRate } : {}),
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
    "Team performance — completed job payouts per member. Date filter uses Technician.dateClosed. Set includeHours for clock-in hours (ClockInOut.clockIn), includeRedos for redo count and rate.",
  permission: "team.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (filters Technician.dateClosed and clock hours). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      userId: {
        type: "number",
        description: "Optional — filter to one team member.",
      },
      includeHours: {
        type: "boolean",
        description: "If true, includes hours worked from clock-in records.",
      },
      includeRedos: {
        type: "boolean",
        description:
          "If true, includes redo count and redo rate per technician.",
      },
    },
    required: [],
  },
  execute,
});
