import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import { db } from "../db";
import getUser from "../getUser";

type TTechnicianJobCompleteNotification = {
  sendRoles?: EmployeeType[];
  companyId?: number;
  technicianUserId?: number;
  invoiceId: string;
  isAllJobsCompleted?: boolean;
};

// send notification for when technician jobs are completed
export const sendTechnicianJobCompleteNotification = async ({
  sendRoles = ["Admin", "Manager"],
  companyId,
  technicianUserId: userId,
  invoiceId,
  isAllJobsCompleted = false, // isAllJobsCompleted = true means all technician jobs are completed.
}: TTechnicianJobCompleteNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
    });
    const getTechnicianUser = await db.user.findFirst({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    for (const user of getUsers) {
      const title = "Technician Job Complete";

      const description = isAllJobsCompleted
        ? `All jobs "${invoiceId}" has been completed by ${getTechnicianUser?.firstName} ${getTechnicianUser?.lastName || ""}. View status in Autoworx.`
        : `Job "${invoiceId}" has been completed by ${getTechnicianUser?.firstName} ${getTechnicianUser?.lastName || ""}. View status in Autoworx`;
      // call actual send notification utility function
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        title,
        description,
        iconType: "invoice",
        type: "JOB_COMPLETED",
        redirectUrl: "/",
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

type TNotifyTechnicianAssignForWorkOrder = {
  technicianUserId: number;
  companyId: number;
  description: string;
  title: string;
};

export async function sendTechnicianAssignForWorkOrderNotify({
  technicianUserId,
  companyId,
  description,
  title,
}: TNotifyTechnicianAssignForWorkOrder) {
  try {
    // call actual send notification utility function

    const technicianUser = await getUser(technicianUserId);
    sendUserNotifications({
      userId: technicianUser.id,
      userName: `${technicianUser.firstName} ${technicianUser.lastName}`,
      userEmail: technicianUser.email || "",
      userPhoneNo: technicianUser.phone || "",
      companyId: companyId || technicianUser.companyId,
      iconType: "invoice",
      title,
      description,
      type: "JOB_ASSIGNED",
      redirectUrl: "/",
    });
  } catch (err) {
    throw err;
  }
}
