import { NotificationType } from "@prisma/client";
import { db } from "../db";

type TNotificationSetting = {
  userId: number;
  notificationType: NotificationType;
};
export const getNotificationSetting = async ({
  userId,
  notificationType,
}: TNotificationSetting) => {
  try {
    const notificationSetting = await db.notificationSettingsV2.findFirst({
      where: {
        userId,
        notification_type: notificationType,
      },
    });
    return notificationSetting;
  } catch (err) {
    throw err;
  }
};
