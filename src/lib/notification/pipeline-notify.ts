import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";
import getUser from "../getUser";

// send notification for when new lead comes in
type TNewLeadNotification = {
  companyId?: number;
  leadClientName: string;
  sendRoles?: EmployeeType[];
};
export const sendNewLeadNotification = async ({
  companyId,
  leadClientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TNewLeadNotification) => {
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

    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;
    const description = `A new leads for ${leadClientName} added to your pipeline. View in Autoworx`;
    const title = "New Lead Added";
    for (const user of getUsers) {
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "LEADS_GENERATED",
      });

      if (setting?.push_enabled) {
        // call actual send notification utility function
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "pipelines",
          redirectUrl,
        });

        // notification for browser push notification
        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });
      }

      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
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

// send notification for when lead is assigned to employee
type TLeadAssignNotification = {
  companyId?: number;
  leadClientName: string;
  assignedEmployeeId: number;
  sendRoles?: EmployeeType[];
};

export const sendLeadAssignNotification = async ({
  companyId,
  leadClientName,
  assignedEmployeeId,
  sendRoles = ["Admin", "Manager"],
}: TLeadAssignNotification) => {
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

    const employeeUser = await getUser(assignedEmployeeId);
    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;
    const description = `New lead "${leadClientName}" assigned to ${employeeUser.firstName} ${employeeUser.lastName}. View in Autoworx.`;
    const title = "Lead Assigned";
    for (const user of getUsers) {
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "LEADS_ASSIGNED",
      });

      if (setting?.push_enabled) {
        // call actual send notification utility function
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "pipelines",
          redirectUrl,
        });

        // notification for browser push notification
        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });
      }

      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
          companyId: companyUniqueId,
          description,
          userPhoneNo: user.phone,
        });
      }
    }

    // send notification to assigned employee
    const assignedEmployeeSetting = await getNotificationSetting({
      userId: assignedEmployeeId,
      notificationType: "LEADS_ASSIGNED",
    });
    if (assignedEmployeeSetting?.push_enabled) {
      // call actual send notification utility function
      await sendNotification({
        userId: assignedEmployeeId,
        title,
        description,
        companyId: companyUniqueId,
        type: "pipelines",
        redirectUrl,
      });

      // notification for browser push notification
      await sendUserNotification({
        userId: assignedEmployeeId,
        title,
        body: description,
        deepLink: redirectUrl,
      });
    }
    // send email notification

    if (assignedEmployeeSetting?.email_enabled && employeeUser.email) {
      sendNotificationByEmail({
        companyId: companyUniqueId,
        description,
        userName: employeeUser.firstName + " " + employeeUser.lastName,
        subject: title,
        userEmail: employeeUser.email,
      });
    }
    // send sms notification
    if (assignedEmployeeSetting?.text_enabled && employeeUser.phone) {
      sendNotificationBySms({
        userName: employeeUser.firstName + " " + employeeUser.lastName,
        companyId: companyUniqueId,
        description,
        userPhoneNo: employeeUser.phone,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when lead change to another column
type TLeadStageChangeNotification = {
  companyId?: number;
  title: string;
  description: string;
  notificationType: "STAGE" | "LEADS_CLOSED";
  sendRoles?: EmployeeType[];
};

export const sendLeadStageChangeOrCloseNotification = async ({
  companyId,
  description,
  title,
  notificationType,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TLeadStageChangeNotification) => {
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

    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;

    for (const user of getUsers) {
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType,
      });

      if (setting?.push_enabled) {
        // call actual send notification utility function
        await sendNotification({
          userId: user.id,
          title,
          description,
          companyId: companyUniqueId,
          type: "pipelines",
          redirectUrl,
        });

        // notification for browser push notification
        await sendUserNotification({
          userId: user.id,
          title,
          body: description,
          deepLink: redirectUrl,
        });
      }

      // send email notification
      if (setting?.email_enabled && user.email) {
        sendNotificationByEmail({
          companyId: companyUniqueId,
          description,
          userName: user.firstName + " " + user.lastName,
          subject: title,
          userEmail: user.email,
        });
      }

      // send sms notification
      if (setting?.text_enabled && user.phone) {
        sendNotificationBySms({
          userName: user.firstName + " " + user.lastName,
          companyId: companyUniqueId,
          description,
          userPhoneNo: user.phone,
        });
      }
    }
  } catch (err) {
    console.log({ err });
    throw err;
  }
};
