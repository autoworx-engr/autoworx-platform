"use server";

import { db } from "@/lib/db";

export async function getInvoiceModalData(id: string) {
  try {
    const invoice = await db.invoice.findFirst({
      where: { id },
      include: {
        company: true,
        invoiceItems: {
          include: {
            service: {
              include: {
                Technician: true,
              },
            },
            materials: true,
            labor: true,
          },
        },
        photos: true,
        tasks: true,
        column: true,
        user: true,
        client: true,
        vehicle: true,
        Refund: true,
      },
    });
  
    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        companyId: invoice?.companyId,
      },
    });
    return {
      invoice: JSON.parse(JSON.stringify(invoice)),
      twilioCredentials,
    };
  } catch (error) {
    throw new Error("Failed to fetch invoice data");
  }
}
