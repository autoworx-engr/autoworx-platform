"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ShopLead } from "@/types/invoiceLead";
import { Technician } from "@prisma/client";
import { getCompanyTimezone } from "../settings/getCompanyTimezone";
import {
  buildUpcomingAppointmentFilter,
  upcomingAppointmentOrderBy,
} from "./_upcomingAppointmentFilter";

function makeInclude(timezone?: string | null) {
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
  };
}

function toShopLead(invoice: any): ShopLead {
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
    dueBalance: Number(invoice.due),
    technicians: allTechnicians,
    appointment: latestAppointment,
  };
}

function makeSearchCondition(search?: string) {
  if (!search?.trim()) return null;

  const words = search.trim().split(/\s+/);

  const makeWordCondition = (word: string) => {
    const ci = { contains: word, mode: "insensitive" as const };
    // Use explicit `is:` wrappers on optional relations so Prisma generates
    // correct SQL when these filters appear inside an OR clause.
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

export async function getWorkOrdersByColumn(
  columnId: number,
  skip: number,
  take: number,
  filterByUserId?: number,
  search?: string,
) {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const baseWhere = {
    companyId,
    columnId,
    type: "Invoice" as const,
    isWorkOrder: true,
  };

  const andConditions: any[] = [];

  if (filterByUserId) {
    andConditions.push({
      invoiceItems: {
        some: {
          service: { Technician: { some: { userId: filterByUserId } } },
        },
      },
    });
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const where =
    andConditions.length > 0 ? { ...baseWhere, AND: andConditions } : baseWhere;

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: makeInclude(timezone),
      orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    leads: invoices.map(toShopLead),
    total,
    hasMore: skip + take < total,
  };
}

export async function getWorkOrdersByTechnician(
  technicianId: number,
  skip: number,
  take: number,
  filterByUserId?: number,
  search?: string,
) {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const techFilter = {
    invoiceItems: {
      some: {
        service: { Technician: { some: { userId: technicianId } } },
      },
    },
  };

  const andConditions: any[] = [techFilter];

  if (filterByUserId) {
    andConditions.push({
      invoiceItems: {
        some: {
          service: { Technician: { some: { userId: filterByUserId } } },
        },
      },
    });
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const where = {
    companyId,
    type: "Invoice" as const,
    isWorkOrder: true,
    AND: andConditions,
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: makeInclude(timezone),
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    leads: invoices.map(toShopLead),
    total,
    hasMore: skip + take < total,
  };
}

const TEAM_SEARCH_PAGE_SIZE = 10;

// Single consolidated query for all technicians when a search term is present.
// Replaces N parallel getWorkOrdersByTechnician calls with one DB round-trip.
export async function getWorkOrdersForTeamSearch(
  technicianUserIds: number[],
  search: string,
  filterByUserId?: number,
) {
  const empty = new Map<
    number,
    { leads: ShopLead[]; total: number; hasMore: boolean }
  >();
  if (!technicianUserIds.length) return empty;

  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const techIdSet = new Set(technicianUserIds);

  const andConditions: any[] = [
    {
      invoiceItems: {
        some: {
          service: {
            Technician: { some: { userId: { in: technicianUserIds } } },
          },
        },
      },
    },
  ];

  if (filterByUserId) {
    andConditions.push({
      invoiceItems: {
        some: {
          service: { Technician: { some: { userId: filterByUserId } } },
        },
      },
    });
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const invoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice" as const,
      isWorkOrder: true,
      AND: andConditions,
    },
    include: makeInclude(timezone),
    orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
  });

  // Group invoices by technician userId — an invoice can appear in multiple columns
  const grouped = new Map<number, ShopLead[]>();
  for (const userId of technicianUserIds) grouped.set(userId, []);

  for (const invoice of invoices) {
    const lead = toShopLead(invoice);
    const assignedIds = new Set<number>();
    for (const item of invoice.invoiceItems) {
      for (const tech of (item.service?.Technician ?? []) as any[]) {
        if (
          tech.userId != null &&
          tech.invoiceId === invoice.id &&
          techIdSet.has(tech.userId)
        ) {
          assignedIds.add(tech.userId);
        }
      }
    }
    for (const uid of assignedIds) grouped.get(uid)!.push(lead);
  }

  const result = new Map<
    number,
    { leads: ShopLead[]; total: number; hasMore: boolean }
  >();
  for (const [uid, leads] of grouped) {
    result.set(uid, {
      leads: leads.slice(0, TEAM_SEARCH_PAGE_SIZE),
      total: leads.length,
      hasMore: leads.length > TEAM_SEARCH_PAGE_SIZE,
    });
  }
  return result;
}
