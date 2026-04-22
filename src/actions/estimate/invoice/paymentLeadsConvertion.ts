"use server";
import { db } from "@/lib/db";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";

export async function paymentLeadsConvertion(invoiceId: string) {
  try {
    // Step 1: Fetch the Invoice and related Client and Lead records first
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          include: {
            Lead: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Now fetch the "Converted" column using the invoice's companyId
    const convertedColumn = await db.column.findFirst({
      where: { companyId: invoice.companyId, title: "Converted" },
      select: { id: true, title: true },
    });

    if (!convertedColumn) {
      throw new Error("Converted column not found");
    }

    // Step 2: Check if the Invoice has an authorizedName present
    const lead = invoice.client?.Lead;

    if (lead) {
      const existingLeadColumn = await db.lead.findUnique({
        where: { id: lead.id },
        select: { columnId: true },
      });
      if (existingLeadColumn?.columnId === convertedColumn.id) {
        console.log("Lead is already in the Converted column");
        return;
      }
      await db.lead.update({
        where: { id: lead.id },
        data: {
          columnId: convertedColumn.id,
          columnChangedAt: new Date(),
        },
      });
      // Step 2: Update the Lead's columnId to "Converted" if the invoice has an authorizedName

      await sendLeadStageChangeOrCloseNotification({
        companyId: invoice?.companyId,
        description: `Lead "${invoice?.client?.firstName}" has been closed. Track it in your pipeline.`,
        title: "Lead Closed",
        notificationType: "LEADS_CLOSED",
      });
    } else {
      console.error("No lead found for the client associated with the invoice");
    }
  } catch (error) {
    console.error("Error updating lead column:", error);
  }
}
