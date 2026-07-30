"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { sendTechnicianJobCompleteNotification } from "@/lib/notification/workOrder-notify";
import { getServerSession } from "next-auth";
import { TECHNICIAN_STATUS } from "@/lib/consts";

export const updateTechnicianStatustoComplete = async (
  invoiceId: string,
  userId?: number,
) => {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const getCurrentUser = await getServerSession(authOptions);
      resolvedUserId = Number(getCurrentUser?.user?.id);
    }

    const updatedTechnician = await db.technician.updateMany({
      where: { invoiceId: invoiceId },
      data: { status: TECHNICIAN_STATUS.COMPLETE, dateClosed: new Date() },
    });

    // send a notification when technician jobs are completed
    sendTechnicianJobCompleteNotification({
      invoiceId,
      technicianUserId: resolvedUserId,
      isAllJobsCompleted: true,
    });
    return updatedTechnician;
  } catch (error) {
    console.error("Error updating technician status to complete:", error);
  }
};
