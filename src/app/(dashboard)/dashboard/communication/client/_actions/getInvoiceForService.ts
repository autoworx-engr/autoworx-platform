"use server";
import { db } from "@/lib/db";

export async function getInvoiceForService(clientId: number) {
  try {
    const invoices = await db.invoice.findMany({
      where: { clientId: clientId },
      include: {
        invoiceItems: {
          include: { service: true },
        },
      },
    });
    return invoices;
  } catch (err) {
    throw err;
  }
}
