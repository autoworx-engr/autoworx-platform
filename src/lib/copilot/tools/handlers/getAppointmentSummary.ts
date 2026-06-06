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

  const appointments = await db.appointment.findMany({
    where: {
      companyId: ctx.companyId,
      ...(userId
        ? {
            OR: [{ userId }, { appointmentUsers: { some: { userId } } }],
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
    select: { id: true, date: true, userId: true },
  });

  const now = new Date();
  let upcoming = 0;
  let past = 0;
  const byUser = new Map<number, number>();

  for (const appt of appointments) {
    if (appt.date && new Date(appt.date) >= now) upcoming++;
    else past++;

    if (appt.userId) {
      byUser.set(appt.userId, (byUser.get(appt.userId) ?? 0) + 1);
    }
  }

  return {
    ok: true,
    data: {
      total: appointments.length,
      upcoming,
      past,
      byUserId: Array.from(byUser.entries()).map(([uid, count]) => ({
        userId: uid,
        count,
      })),
      period: startDate && endDate ? { startDate, endDate } : "all time",
    },
  };
}

registerTool({
  name: "get_appointment_summary",
  description:
    "Appointment summary — total count, upcoming vs past, and per-user breakdown. Date filter uses Appointment.date. Use when the user asks about schedule, bookings, or appointment volume.",
  permission: "appointment.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description:
          "Start date YYYY-MM-DD (filters by Appointment.date). Omit for all-time.",
      },
      endDate: { type: "string", description: "End date YYYY-MM-DD." },
      userId: {
        type: "number",
        description: "Optional — filter to appointments for one user.",
      },
    },
    required: [],
  },
  execute,
});
