"use server";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const updateLeaveRequestStatus = async (
  leaveRequestId: number,
  status: LeaveRequestStatus,
) => {
  try {
    const user = await getUser();

    if (user.employeeType !== "Admin" && user.employeeType !== "Manager") {
      throw new Error(
        "Unauthorized: only Admin or Manager can update leave request status",
      );
    }

    const updatedLeaveRequest = await db.leaveRequest.update({
      where: {
        id: leaveRequestId,
        companyId: user.companyId,
      },
      data: {
        status,
      },
    });

    revalidatePath("/dashboard/settings/my-account/leave-requests");
    revalidatePath("/");

    return {
      success: true,
      message: "Leave Request Status Updated Successfully",
      data: updatedLeaveRequest,
    };
  } catch (err: unknown) {
    return { success: false, message: "Leave Request Status Updating Failed" };
  }
};
