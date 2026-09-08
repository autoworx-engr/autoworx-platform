import { ShopLead } from "@/types/invoiceLead";
import { Technician } from "@prisma/client";
import {
  buildUpcomingAppointmentFilter,
  upcomingAppointmentOrderBy,
} from "./_upcomingAppointmentFilter";

export function makeInclude(timezone?: string | null) {
  return {
    client: {
      include: {
        appointments: {
          where: buildUpcomingAppointmentFilter(timezone),
          orderBy: upcomingAppointmentOrderBy,
          take: 1,
          select: { id: true, date: true, startTime: true, endTime: true },
        },
      },
    },
    vehicle: true,
    invoiceItems: {
      include: {
        service: {
          include: { Technician: true },
        },
      },
    },
    tags: { select: { id: true, tag: true } },
    tasks: true,
    assignedTo: true,
    column: true,
    technician: { select: { userId: true } },
  };
}

export function toShopLead(invoice: any): ShopLead {
  const completed: string[] = [];
  const incomplete: string[] = [];
  const unAssigned: string[] = [];
  const allTechnicians: Technician[] = [];

  for (const item of invoice.invoiceItems) {
    const techs: Technician[] =
      item.service?.Technician?.filter(
        (t: Technician) => t.invoiceId === invoice.id,
      ) ?? [];

    if (techs.length > 0) {
      const done = techs.every(
        (t: any) => t.status?.toLowerCase().trim() === "complete",
      );
      if (done) {
        if (item.service?.name) completed.push(item.service.name);
      } else {
        if (item.service?.name) incomplete.push(item.service.name);
      }
    } else {
      if (item.service?.name) unAssigned.push(item.service.name);
    }
    allTechnicians.push(...techs);
  }

  const latestAppointment = invoice.client?.appointments?.[0] ?? null;

  return {
    invoiceId: invoice.id,
    name: `${invoice.client?.firstName ?? ""} ${invoice.client?.lastName ?? ""}`.trim(),
    email: invoice.client?.email ?? "",
    phone: invoice.client?.mobile ?? "",
    clientId: invoice.clientId,
    deliveredAt: invoice.deliveredAt,
    vehicle:
      `${invoice.vehicle?.year ?? ""} ${invoice.vehicle?.make ?? ""} ${invoice.vehicle?.model ?? ""} ${invoice.vehicle?.other ?? ""}`.trim(),
    vehicleId: invoice.vehicleId,
    services: { completed, incomplete, unAssigned },
    tags: invoice.tags.map((t: any) => ({ id: t.id, tag: t.tag })),
    tasks: invoice.tasks,
    assignedTo: invoice.assignedTo,
    createdAt: new Date(invoice.createdAt).toDateString(),
    columnId: invoice.columnId,
    columnTitle: invoice.column?.title ?? null,
    dueBalance: Number(invoice.due),
    technicians: allTechnicians,
    appointment: latestAppointment,
  };
}

export function assignedTechnicianFilter(
  userId: number | { in: number[] },
  companyId: number,
) {
  return { technician: { some: { userId, companyId } } };
}

export function makeSearchCondition(search?: string) {
  if (!search?.trim()) return null;

  const words = search.trim().split(/\s+/);

  const makeWordCondition = (word: string) => {
    const ci = { contains: word, mode: "insensitive" as const };
    const conditions: any[] = [
      { client: { is: { firstName: ci } } },
      { client: { is: { lastName: ci } } },
      { vehicle: { is: { make: ci } } },
      { vehicle: { is: { model: ci } } },
      { vehicle: { is: { submodel: ci } } },
      { vehicle: { is: { other: ci } } },
    ];
    // year is Int? — needs equals, not contains
    const yearInt = parseInt(word, 10);
    if (!isNaN(yearInt) && String(yearInt) === word) {
      conditions.push({ vehicle: { is: { year: { equals: yearInt } } } });
    }
    return { OR: conditions };
  };

  if (words.length === 1) return makeWordCondition(words[0]);
  return { AND: words.map(makeWordCondition) };
}
