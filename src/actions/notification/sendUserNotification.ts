"use server";

import { getNotificationSetting } from "@/lib/notification/getNotificationSetting";
import { NotificationType } from "@prisma/client";
import { sendNotification } from "./sendNotification";
import { sendPushNotification } from "./sendPushNotification";
import sendNotificationByEmail from "./sendNotificationByEmail";
import sendNotificationBySms from "./sendNotificationBySms";

type SendUserNotificationsParams = {
  userId: number;
  userName: string;
  userPhoneNo: string;
  userEmail: string;
  companyId: number;
  title: string;
  description: string;
  type: NotificationType;
  iconType:
    | "communication"
    | "message"
    | "inventory"
    | "invoice"
    | "task"
    | "payment"
    | "pipelines"
    | "directory"
    | "other";
  redirectUrl: string;
};

export async function sendUserNotifications({
  userId,
  userName,
  userEmail,
  title,
  description,
  userPhoneNo,
  companyId,
  type,
  iconType,
  redirectUrl,
}: SendUserNotificationsParams) {
  try {
    const setting = await getNotificationSetting({
      userId,
      notificationType: type,
    });

    console.log("Notification Setting:", setting, userId);

    if (setting?.push_enabled) {
      await sendNotification({
        userId,
        title,
        description,
        companyId,
        type: iconType,
        redirectUrl,
      });

      await sendPushNotification({
        userId,
        title,
        body: description,
        deepLink: redirectUrl,
      });
    }

    // send email notification
    if (setting?.email_enabled && userEmail) {
      sendNotificationByEmail({
        companyId,
        description,
        userName: userName,
        subject: title,
        userEmail,
      });
    }

    // send sms notification
    if (setting?.text_enabled && userPhoneNo) {
      sendNotificationBySms({
        userName,
        companyId,
        description,
        userPhoneNo,
      });
    }
  } catch (error) {
    console.error("Error sending user notification:", error);
    throw error;
  }
}
