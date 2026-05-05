"use server";

import { db } from "@/lib/db";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { ServerAction } from "@/types/action";
import { TECHNICIAN_STATUS } from "@/lib/consts";

// 1. Fetch the invoice by its ID, including its associated technicians.
// 2. If no technicians are found, return a success message without making any updates.
// 3. Check if all technicians have completed their tasks or if any are currently in progress.
// 4. Based on the technicians' statuses:
//    - If all are complete, move the work order to the "Completed" column and set the completion date.
//    - If any are in progress, move the work order to the "In Progress" column.
// 5. Update the invoice with the new column ID and completion date (if applicable).

export async function updateWorkOrderStatus(id: string): Promise<ServerAction> {
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      technician: {
        select: {
          status: true,
        },
      },
      column: {
        select: {
          title: true,
        },
      },
    },
  });

  const technicians = invoice?.technician;

  if (!technicians || technicians.length === 0) {
    // No need to update the status if there are no technicians
    return { type: "success", message: "No technicians found" };
  }

  const allComplete = technicians.every(
    (technician) => technician.status === TECHNICIAN_STATUS.COMPLETE,
  );
  const anyInProgress = technicians.some(
    (technician) => technician.status === TECHNICIAN_STATUS.IN_PROGRESS,
  );
  const anyPending = technicians.some(
    (technician) =>
      technician.status === TECHNICIAN_STATUS.PENDING ||
      technician.status === TECHNICIAN_STATUS.CANCEL,
  );

  // Check if the current status is already "Completed" and all technicians are complete
  if (
    (allComplete && invoice?.column?.title === "Completed") ||
    invoice?.column?.title === "Delivered"
  ) {
    return { type: "success", message: "Work order is already in final state" };
  }
  let columnId = invoice.columnId;
  let completedAt: Date | undefined | null;
  if (anyPending) {
    // Find the "Pending" column
    const pendingColumn = await db.column.findFirst({
      where: {
        title: "Pending",
        type: "shop",
        companyId: invoice.companyId,
      },
    });

    if (pendingColumn) {
      columnId = pendingColumn.id;
    } else {
      throw new Error("Pending column not found");
    }
  } else if (anyInProgress) {
    // Find the "In Progress" column
    const inProgressColumn = await db.column.findFirst({
      where: {
        title: "In Progress",
        type: "shop",
        companyId: invoice.companyId,
      },
    });

    if (inProgressColumn) {
      columnId = inProgressColumn.id;
    } else {
      throw new Error("In Progress column not found");
    }
  } else if (allComplete) {
    // Find the "Completed" column
    const completeColumn = await db.column.findFirst({
      where: {
        title: "Completed",
        type: "shop",
        companyId: invoice.companyId,
      },
    });

    if (completeColumn) {
      columnId = completeColumn.id;
      completedAt = new Date();
    } else {
      throw new Error("Completed column not found");
    }
  }

  // const updatedInvoice = await db.invoice.update({
  //   where: { id },
  //   data: {
  //     columnId,
  //     completedAt,
  //   },
  // });

  // if (invoice.columnId != updatedInvoice.columnId) {
  //   // if work order status update invoice automation trigger
  //   await updateInvoiceAutomationTrigger({
  //     companyId: updatedInvoice?.companyId!,
  //     invoiceId: updatedInvoice?.id,
  //     columnId: updatedInvoice?.columnId!,
  //     type: updatedInvoice?.type!,
  //   });
  // }

  return { type: "success", message: "Work order status updated" };
}
