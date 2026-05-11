import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  assignedUserId: z.number().int().positive().optional(),
  take: z.number().int().min(1).max(50).default(20),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { startDate, endDate, assignedUserId, take } = input as Input;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const appointments = await db.appointment.findMany({
    where: {
      companyId: ctx.companyId,
      date: { gte: start, lte: end },
      ...(assignedUserId
        ? { appointmentUsers: { some: { userId: assignedUserId } } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      notes: true,
      client: { select: { firstName: true, lastName: true } },
      vehicle: { select: { year: true, make: true, model: true } },
      appointmentUsers: {
        select: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    take,
    orderBy: { date: "asc" },
  });

  return {
    ok: true,
    data: appointments.map((a) => ({
      id: a.id,
      title: a.title,
      date: a.date ? a.date.toISOString().slice(0, 10) : null,
      startTime: a.startTime ?? null,
      endTime: a.endTime ?? null,
      clientName: a.client
        ? `${a.client.firstName} ${a.client.lastName ?? ""}`.trim()
        : null,
      vehicleInfo: a.vehicle
        ? [a.vehicle.year, a.vehicle.make, a.vehicle.model]
            .filter(Boolean)
            .join(" ") || null
        : null,
      assignedUsers: a.appointmentUsers
        .filter((au) => au.user)
        .map((au) => ({
          id: au.user!.id,
          name:
            `${au.user!.firstName} ${au.user!.lastName ?? ""}`.trim() ||
            "Unknown",
        })),
      notes: a.notes ?? null,
    })),
  };
}

registerTool({
  name: "get_appointments_for_date_range",
  description:
    "List appointments within a date range, optionally filtered by assigned user. Use when the user asks about upcoming or past appointments.",
  permission: "appointment.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format",
      },
      endDate: {
        type: "string",
        description: "End date in YYYY-MM-DD format",
      },
      assignedUserId: {
        type: "number",
        description: "Optional: filter by assigned user ID",
      },
      take: {
        type: "number",
        description: "Max results to return (1–50, default 20)",
      },
    },
    required: ["startDate", "endDate"],
  },
  execute,
});
