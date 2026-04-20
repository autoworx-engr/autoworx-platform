"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ShopLead } from "@/types/invoiceLead";
import { Technician } from "@prisma/client";

const INCLUDE = {
  client: true,
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
} as const;

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
  };
}

export async function getWorkOrdersByColumn(
  columnId: number,
  skip: number,
  take: number,
  filterByUserId?: number,
) {
  const companyId = await getCompanyId();

  const baseWhere = {
    companyId,
    columnId,
    type: "Invoice" as const,
    isWorkOrder: true,
  };

  const where = filterByUserId
    ? {
        ...baseWhere,
        invoiceItems: {
          some: {
            service: {
              Technician: { some: { userId: filterByUserId } },
            },
          },
        },
      }
    : baseWhere;

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: INCLUDE,
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
) {
  const companyId = await getCompanyId();

  const techFilter = {
    invoiceItems: {
      some: {
        service: { Technician: { some: { userId: technicianId } } },
      },
    },
  };

  const where = filterByUserId
    ? {
        companyId,
        type: "Invoice" as const,
        isWorkOrder: true,
        AND: [
          techFilter,
          {
            invoiceItems: {
              some: {
                service: {
                  Technician: { some: { userId: filterByUserId } },
                },
              },
            },
          },
        ],
      }
    : {
        companyId,
        type: "Invoice" as const,
        isWorkOrder: true,
        ...techFilter,
      };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: INCLUDE,
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
