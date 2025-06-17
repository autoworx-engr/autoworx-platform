import { sendNotification } from "@/actions/notification/sendNotification";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import sendNotificationBySms from "@/actions/notification/sendNotificationBySms";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import moment from "moment";
import getUser from "../getUser";
import { sendUserNotification } from "../sendUserNotification";
import { getNotificationSetting } from "./getNotificationSetting";

// send Notification for when new client send a email
type TClientEmailNotification = {
  companyId: number;
  clientName: string;
  clientId: number;
  sendAt: Date | number | null;
  sendRoles?: EmployeeType[];
};

export const sendClientEmailNotification = async ({
  companyId,
  clientName,
  clientId,
  sendAt,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientEmailNotification) => {
  try {
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });
    const redirectUrl = `/dashboard/communication/client/${clientId}`;
    const description = `Email from "${clientName}" received. View in your Autoworx inbox.`;
    const title = "Send a email from Client";
    for (const user of getUsers) {
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "CLIENT_EMAIL_ALERT",
      });

      if (setting?.push_enabled) {
        // call actual send notification utility function
        await sendNotification({
          userId: user.id,
          title,
          companyId,
          type: "communication",
          description,
          redirectUrl,
        });

        // send notification to browser
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
          companyId,
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
          companyId,
          description,
          userPhoneNo: user.phone,
        });
      }
    }
  } catch (err) {
    console.log("client email error", err);
    throw err;
  }
};

// send notification for when client message
type TClientMessageNotification = {
  companyId: number;
  clientName?: string;
  clientId: number;
  sendRoles?: EmployeeType[];
};

export const sendClientMessageNotification = async ({
  companyId,
  clientId,
  clientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TClientMessageNotification) => {
  try {
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/communication/client/${clientId}`;

    const description = `Message from ${clientName} received. View and respond in Autoworx`;
    const title = "New Client Message";

    for (const user of getUsers) {
      // call actual send notification utility function
      const setting = await getNotificationSetting({
        userId: user.id,
        notificationType: "CLIENT_MESSAGE_ALERT",
      });

      if (setting?.push_enabled) {
        await sendNotification({
          userId: user.id,
          title,
          companyId,
          type: "message",
          description,
          redirectUrl,
        });

        // send notification to browser
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
          companyId,
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
          companyId,
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

type TInternalMessageNotification = {
  companyId?: number;
  toUserId: number;
  message: number;
};

// COMMUNICATION NOTIFICATION FOR INTERNAL MESSAGES
export const sendInternalMessageNotification = async ({
  toUserId,
  message,
}: TInternalMessageNotification) => {
  try {
    const sessionUser = await getUser();
    const toUser = await getUser(toUserId);
    const setting = await getNotificationSetting({
      userId: toUserId,
      notificationType: "INTERNAL_MESSAGE_ALERT",
    });
    const redirectUrl = `/dashboard/communication/internal`;
    const sessionUserFullName = `${sessionUser.firstName} ${sessionUser.lastName}`;
    const description = `New internal message from ${sessionUserFullName}. View it in Autoworx`;
    const title = "New Internal Message";
    if (setting?.push_enabled) {
      await sendNotification({
        userId: toUserId,
        title,
        description,
        type: "message",
        redirectUrl,
      });

      // send notification to browser
      await sendUserNotification({
        userId: toUserId,
        title,
        body: description,
        deepLink: redirectUrl,
      });
    }

    // send email notification
    if (setting?.email_enabled && toUser.email) {
      sendNotificationByEmail({
        companyId: toUser.companyId,
        description,
        userName: toUser.firstName + " " + toUser.lastName,
        subject: title,
        userEmail: toUser.email,
      });
    }

    // send sms notification
    if (setting?.text_enabled && toUser.phone) {
      sendNotificationBySms({
        userName: toUser.firstName + " " + toUser.lastName,
        companyId: toUser.companyId,
        description,
        userPhoneNo: toUser.phone,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
