"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export async function getWorkOrdersByTechnician(technicianId: number) {
  const companyId = await getCompanyId();
  const invoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice",
      isWorkOrder: true,
      invoiceItems: {
        some: {
          service: {
            Technician: {
              some: {
                userId: technicianId,
              },
            },
          },
        },
      },
    },
    include: {
      client: true,
      vehicle: true,
      invoiceItems: {
        include: {
          service: {
            include: {
              Technician: true,
            },
          },
        },
      },
      tags: {
        select: {
          id: true,
          tag: true,
        },
      },
      tasks: true,
      assignedTo: true,
      column: true,
    },
  });

  return invoices;
}
