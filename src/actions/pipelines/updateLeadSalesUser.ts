"use server";
import { db } from "@/lib/db";
import { sendLeadAssignNotification } from "@/lib/notification/pipeline-notify";
import { revalidatePath } from "next/cache";
export async function updateLeadSalesUser(leadId: number, salesUserId: number) {
  try {
    const updatedLead = await db.lead.update({
      where: {
        id: leadId,
      },
      data: {
        assignedSalesUserId: salesUserId,
        assignedDate: new Date(),
      },
    });
    await sendLeadAssignNotification({
      companyId: updatedLead.companyId,
      leadClientName: updatedLead.clientName ?? "",
      assignedEmployeeId: salesUserId,
    });
    return updatedLead;
  } catch (error) {
    console.error("Error updating lead sales user:", error);
    throw error;
  }
}
export async function removeLeadFromPipeline(leadId: number) {
  try {
    const updatedLead = await db.lead.update({
      where: {
        id: leadId,
      },
      data: {
        columnId: null,
        isQualified: false,
      },
    });
    revalidatePath("/dashboard/pipeline/sales/lead");
    return updatedLead;
  } catch (error) {
    console.error("Error removing lead from pipeline:", error);
    throw error;
  }
}
