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

  const clockEntries = await db.clockInOut.findMany({
    where: {
      companyId: ctx.companyId,
      ...(userId ? { userId } : {}),
      ...(startDate && endDate
        ? {
            clockIn: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    select: {
      userId: true,
      clockIn: true,
      clockOut: true,
      user: { select: { firstName: true, lastName: true } },
      ClockBreak: { select: { breakStart: true, breakEnd: true } },
    },
    orderBy: { clockIn: "desc" },
  });

  const byUser = new Map<
    number,
    {
      name: string;
      grossMs: number;
      breakMs: number;
      days: Set<string>;
      entries: number;
    }
  >();

  for (const entry of clockEntries) {
    const uid = entry.userId;
    const name = entry.user
      ? `${entry.user.firstName} ${entry.user.lastName ?? ""}`.trim()
      : `User ${uid}`;

    const eu = byUser.get(uid) ?? {
      name,
      grossMs: 0,
      breakMs: 0,
      days: new Set<string>(),
      entries: 0,
    };

    // Gross: skip entries with no clockOut (still clocked in)
    if (entry.clockOut) {
      eu.grossMs +=
        new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime();
    }

    // Break deduction
    for (const b of entry.ClockBreak) {
      if (b.breakEnd) {
        eu.breakMs +=
          new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime();
      }
    }

    // Distinct days
    eu.days.add(new Date(entry.clockIn).toISOString().slice(0, 10));
    eu.entries++;

    byUser.set(uid, eu);
  }

  const employees = Array.from(byUser.entries()).map(([id, u]) => {
    const grossHours = Math.round((u.grossMs / 3600000) * 100) / 100;
    const breakHours = Math.round((u.breakMs / 3600000) * 100) / 100;
    const netHours = Math.round((grossHours - breakHours) * 100) / 100;
    return {
      id,
      name: u.name,
      grossHours,
      breakHours,
      netHours,
      daysWorked: u.days.size,
      entries: u.entries,
    };
  });

  const totalNetHours =
    Math.round(employees.reduce((s, e) => s + e.netHours, 0) * 100) / 100;

  return {
    ok: true,
    data: {
      employees,
      totalNetHours,
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_clock_report",
  description:
    "Employee hours report — gross clock hours minus break time, per employee. For payroll and utilization tracking. Date filter uses ClockInOut.clockIn.",
  permission: "team.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (ClockInOut.clockIn). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      userId: {
        type: "number",
        description: "Optional — filter to one employee.",
      },
    },
    required: [],
  },
  execute,
});
