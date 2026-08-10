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
        payments: {
          include: {
            card: true,
            check: true,
            cash: true,
            other: {
              include: {
                paymentMethod: true,
              },
            },
            deposit: true,
            Refund: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const twilioCredential = await db.twilioCredentials.findFirst({
      where: {
        companyId: invoice?.companyId,
      },
    });

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        companyId: invoice?.companyId,
      },
    });

    const twilioCredentials = twilioCredential || infobipConfig || null;

    return {
      invoice: JSON.parse(JSON.stringify(invoice)),
      twilioCredentials,
    };
  } catch (error) {
    console.error("[getInvoiceModalData] Failed to fetch invoice data:", error);
    throw error;
  }
}
