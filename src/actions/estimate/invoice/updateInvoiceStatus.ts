"use server";
import { db } from "@/lib/db";
import { updateServiceAutomationTrigger } from "@/service/service-maintenance-automation-trigger/api";
import { InvoiceType } from "@prisma/client";
import { sendInvoiceDeliveredNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { revalidatePath } from "next/cache";

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
      const updatedInvoice = await db.invoice.update({
        where: { id: invoiceId },
        data: {
          columnId: newStatusId,
          type: type,
          convertedAt: typeChanted ? new Date() : currentInvoice?.convertedAt,
          completedAt: completedAt,
          deliveredAt: deliveredAt,
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      revalidatePath("/dashboard/pipeline/shop/pipeline");
      if (column?.title === "Delivered") {
        // send notification when invoice is delivered
        sendInvoiceDeliveredNotification({
          companyId: updatedInvoice.companyId,
          invoiceId: updatedInvoice.id,
          clientName: `${updatedInvoice.client?.firstName} ${updatedInvoice.client?.lastName}`,
        }).catch((err) =>
          console.error("sendInvoiceDeliveredNotification failed", err),
        );
      }

      await updateServiceAutomationTrigger({
        companyId: updatedInvoice?.companyId!,
        estimateId: updatedInvoice?.id!,
        columnId: updatedInvoice?.columnId!,
      });
      // if invoice status update invoice automation trigger
      await updateInvoiceAutomationTrigger({
        companyId: updatedInvoice?.companyId!,
        invoiceId: updatedInvoice?.id!,
        columnId: updatedInvoice?.columnId!,
        type: updatedInvoice?.type!,
      });

      await updateTagAutomationTrigger({
        columnId: updatedInvoice?.columnId!,
        companyId: updatedInvoice?.companyId!,
        pipelineType: "SHOP",
        invoiceId: updatedInvoice?.id!,
        conditionType: "post_tag",
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
