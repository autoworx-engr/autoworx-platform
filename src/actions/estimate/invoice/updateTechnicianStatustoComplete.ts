"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { sendTechnicianJobCompleteNotification } from "@/lib/notification/workOrder-notify";
import { getServerSession } from "next-auth";

export const updateTechnicianStatustoComplete = async (invoiceId: string) => {
  try {
    const getCurrentUser = await getServerSession(authOptions);
    const updatedTechnician = await db.technician.updateMany({
      where: { invoiceId: invoiceId },
      data: { status: "Complete", dateClosed: new Date() },
    });

    // send a notification when technician jobs are completed
    sendTechnicianJobCompleteNotification({
      invoiceId,
      technicianUserId: Number(getCurrentUser?.user?.id),
      isAllJobsCompleted: true,
    });
    return updatedTechnician;
  } catch (error) {
    console.error("Error updating technician status to complete:", error);
  }
};
