"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getInvoiceItemTitle } from "@/utils/invoiceItemTitle";
import { EmployeeType } from "@prisma/client";
import { getEmployeeColumnByCompany } from "./pipelinesColumn";

export type WeekAssignment = {
  id: number;
  invoiceId: string;
  clientName: string;
  title: string;
  vehicle: string;
  /** Clamped to the requested week, as day offsets 0-6 */
  startDay: number;
  endDay: number;
  startsBefore: boolean;
  endsAfter: boolean;
  /** The work order's own due date (YYYY-MM-DD), used for ordering */
  dueDate: string | null;
  status: string | null;
  priority: string | null;
};

export type WeekMember = {
  id: number;
  name: string;
  employeeType: EmployeeType | null;
  assignments: WeekAssignment[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dayIndex = (value: Date, weekStart: Date) =>
  Math.floor((value.getTime() - weekStart.getTime()) / DAY_MS);

export async function getTeamWeekSchedule(
  weekStartISO: string,
  employeeType?: EmployeeType,
  employeeId?: number,
  filterByUserId?: number,
): Promise<WeekMember[]> {
  const companyId = await getCompanyId();

  // The session-derived self-scope wins over the picked employee, matching the
  // list and kanban views.
  const userId = filterByUserId ?? employeeId;

  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  const weekEndOfDay = new Date(weekEnd.getTime() + DAY_MS - 1);

  const employees = await getEmployeeColumnByCompany(employeeType, userId);
  if (!employees.length) return [];

  const rows = await db.technician.findMany({
    where: {
      companyId,
      userId: { in: employees.map((employee) => employee.id) },
      invoice: { is: { companyId, type: "Invoice", isWorkOrder: true } },
      OR: [
        { date: { gte: weekStart, lte: weekEndOfDay } },
        { due: { gte: weekStart, lte: weekEndOfDay } },
        // Spans the whole week without starting or ending inside it
        { AND: [{ date: { lt: weekStart } }, { due: { gt: weekEndOfDay } }] },
      ],
    },
    include: {
      service: { select: { name: true } },
      invoiceItem: {
        include: { service: true, labor: true, materials: true },
      },
      invoice: { include: { vehicle: true, client: true } },
    },
    orderBy: [{ due: "asc" }, { date: "asc" }],
  });

  const byUser = new Map<number, WeekAssignment[]>();
  for (const employee of employees) byUser.set(employee.id, []);

  for (const row of rows) {
    const rawStart = row.date ?? row.due;
    const rawEnd = row.due ?? row.date;
    if (!rawStart || !rawEnd) continue;

    const startsBefore = rawStart < weekStart;
    const endsAfter = rawEnd > weekEndOfDay;
    const startDay = Math.max(0, Math.min(6, dayIndex(rawStart, weekStart)));
    const endDay = Math.max(startDay, Math.min(6, dayIndex(rawEnd, weekStart)));

    const invoice = row.invoice;
    byUser.get(row.userId)?.push({
      id: row.id,
      invoiceId: row.invoiceId,
      clientName:
        `${invoice?.client?.firstName ?? ""} ${invoice?.client?.lastName ?? ""}`.trim(),
      title:
        (row.invoiceItem ? getInvoiceItemTitle(row.invoiceItem) : null) ??
        row.service?.name ??
        "Work Order",
      vehicle:
        `${invoice?.vehicle?.year ?? ""} ${invoice?.vehicle?.make ?? ""} ${invoice?.vehicle?.model ?? ""}`.trim(),
      startDay,
      endDay,
      startsBefore,
      endsAfter,
      dueDate: invoice?.dueDate ?? null,
      status: row.status,
      priority: row.priority,
    });
  }

  return employees.map((employee) => ({
    id: employee.id,
    name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
    employeeType: employee.employeeType,
    assignments: byUser.get(employee.id) ?? [],
  }));
}
