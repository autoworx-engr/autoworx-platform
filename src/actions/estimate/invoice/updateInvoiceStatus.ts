"use server";
import { db } from "@/lib/db";
import { InvoiceType } from "@prisma/client";

export async function updateInvoiceStatus(
  invoiceId: string,
  newStatusId: number,
) {
  let type: InvoiceType | undefined;
  let typeChanted = false;
  let deliveredAt: Date | undefined | null;
  let completedAt: Date | undefined | null;
  if (invoiceId) {
    const currentInvoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    const column = await db.column.findUnique({
      where: {
        id: newStatusId,
      },
    });

    if (column) {
      if (column.title === "In Progress") {
        type = "Invoice";
        typeChanted = true;
        deliveredAt = null;
      } else if (column.title === "Delivered") {
        // // Only set deliveredAt if it hasn't been set already
        // if (!currentInvoice?.deliveredAt) {
        //   deliveredAt = new Date();
        // } else {
        deliveredAt = new Date();
        // }
      } else if (column.title === "Completed") {
        // if (!currentInvoice?.completedAt) {
        //   completedAt = new Date();
        // } else {
        completedAt = new Date();
        // }
      } else {
        if (currentInvoice?.type === "Invoice") {
          type = "Invoice";
        }
        deliveredAt = null;
      }
    } else {
      throw new Error(
        "Column not found to create invoice conversions at pipeline stage",
      );
    }
    try {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          columnId: newStatusId,
          type: type,
          convertedAt: typeChanted ? new Date() : currentInvoice?.convertedAt,
          completedAt: completedAt,
          deliveredAt: deliveredAt,
        },
      });
      return { type: "success" };
    } catch (error) {
      console.error("Error updating invoice status:", error);
      return { type: "error", message: "Failed to update invoice status" };
    }
  } else {
    return { type: "error", message: "Invoice not found" };
  }
}
