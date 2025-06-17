import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { db } from "../db";
import { sendNotification } from "@/actions/notification/sendNotification";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
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
      // const notificationSettings = await getNotificationFromDB(user.id);

      // Job "${invoiceId}" has been completed by ${getTechnicianUser?.firstName} ${getTechnicianUser?.lastName || ""}. View status in Autoworx.
      const description = isAllJobsCompleted
        ? `All jobs "${invoiceId}" has been completed by ${getTechnicianUser?.firstName} ${getTechnicianUser?.lastName || ""}. View status in Autoworx.`
        : `Job "${invoiceId}" has been completed by ${getTechnicianUser?.firstName} ${getTechnicianUser?.lastName || ""}. View status in Autoworx`;
      // call actual send notification utility function
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "JOB_COMPLETED",
      });

      if (setting?.push_enabled) {
        await sendNotification({
          userId: user.id,
          title: "Technician Job Complete",
          description,
          companyId: companyUniqueId,
          type: "invoice",
        });

        await sendUserNotification({
          userId: user.id,
          title: "Technician Job Complete",
          body: description,
          deepLink: "/",
        });
      }
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
    const setting = await getNotificationSetting({
      userId: technicianUserId,
      notificationType: "JOB_COMPLETED",
    });

    const technicianUser = await getUser(technicianUserId);
    if (setting?.push_enabled) {
      await sendNotification({
        userId: technicianUserId,
        title,
        description,
        companyId,
        type: "invoice",
      });

      // send notification to browser
      await sendUserNotification({
        userId: technicianUserId,
        title,
        body: description,
        deepLink: "/",
      });
    }

    if (setting?.email_enabled && technicianUser.email) {
      sendNotificationByEmail({
        companyId: technicianUser.companyId,
        description,
        userName: `${technicianUser.firstName} ${technicianUser.lastName}`,
        subject: title,
        userEmail: technicianUser.email,
      });
    }

    if (setting?.text_enabled && technicianUser.phone) {
      sendNotificationBySms({
        userName: `${technicianUser.firstName} ${technicianUser.lastName}`,
        companyId: technicianUser.companyId,
        description,
        userPhoneNo: technicianUser.phone,
      });
    }
  } catch (err) {
    throw err;
  }
}
