import { sendNotification } from "@/actions/notification/sendNotification";
import { getCompanyId } from "../companyId";
import { sendUserNotification } from "../sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getNotificationSetting } from "./getNotificationSetting";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";

// send notification for New leave request from employee
type TLeaveRequestNotification = {
  companyId?: number;
  startDate: string;
  endDate: string;
  employeeName: string;
  sendRoles?: EmployeeType[];
  employeeId: number;
};

export const sendLeaveRequestNotification = async ({
  companyId,
  startDate,
  endDate,
  employeeName,
  employeeId,
  sendRoles = ["Admin", "Manager"],
}: TLeaveRequestNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });
    const redirectUrl = `/dashboard/employee/${employeeId}?view=performance`;
    const title = "Leave Request";
    const description = `${employeeName} has requested leave from ${startDate} to ${endDate}.`;
    for (const user of getUsers) {
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "LEAVE_REQUEST",
      });

      if (setting?.push_enabled) {
        // call actual send notification utility function
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "directory",
          redirectUrl,
        });

        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });
      }

      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description,
          userName: `${user.firstName} ${user.lastName}`,
          subject: title,
          userEmail: user.email,
        });
      }

      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: `${user.firstName} ${user.lastName}`,
          companyId: companyUniqueId,
          description,
          userPhoneNo: user.phone,
        });
      }
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
