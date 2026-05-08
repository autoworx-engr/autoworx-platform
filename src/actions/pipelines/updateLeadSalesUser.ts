"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { sendLeadAssignNotification } from "@/lib/notification/pipeline-notify";
import { revalidatePath } from "next/cache";

export async function updateLeadSalesUser(
  leadId: number,
  salesUserId: number | null,
  companyIdOverride?: number,
) {
  const companyId = companyIdOverride ?? (await getCompanyId());
  try {
    const updatedLead = await db.lead.update({
      where: {
        id: leadId,
        companyId,
      },
      data: {
        assignedSalesUserId: salesUserId,
        assignedDate: salesUserId ? new Date() : null,
      },
    });
    if (salesUserId) {
      await sendLeadAssignNotification({
        companyId,
        leadClientName: updatedLead.clientName ?? "",
        assignedEmployeeId: salesUserId,
      });
    }
    return updatedLead;
  } catch (error) {
    throw error;
  }
}

export async function removeLeadFromPipeline(
  leadId: number,
  companyIdOverride?: number,
) {
  const companyId = companyIdOverride ?? (await getCompanyId());
  try {
    const updatedLead = await db.lead.update({
      where: {
        id: leadId,
        companyId,
      },
      data: {
        columnId: null,
        isQualified: false,
      },
    });
    revalidatePath("/dashboard/pipeline/sales/lead");
    return updatedLead;
  } catch (error) {
    throw error;
  }
}
