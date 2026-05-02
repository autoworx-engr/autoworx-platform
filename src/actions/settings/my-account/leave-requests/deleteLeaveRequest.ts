"use server";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { LeaveRequest } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const deleteLeaveRequest = async (leaveRequest: LeaveRequest) => {
  try {
    const user = await getUser();
    if (user.id !== leaveRequest.userId) {
      throw new Error("Unauthorized: you do not own this leave request");
    }
    await db.leaveRequest.delete({
      where: {
        id: leaveRequest.id,
      },
    });
    revalidatePath("/dashboard/settings/my-account/leave-requests");
    return {
      success: true,
      message: "Leave Request Deleted Successfully",
    };
  } catch (err: unknown) {
    return { success: false, message: "Delete Leave Request Failed" };
  }
};
