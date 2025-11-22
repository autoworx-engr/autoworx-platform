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
      select: {
        email_enabled: true,
        push_enabled: true,
        text_enabled: true,
      },
    });
    return notificationSetting as {
      email_enabled: boolean;
      push_enabled: boolean;
      text_enabled: boolean;
      notification_type: NotificationType;
    } | null;
  } catch (err) {
    throw err;
  }
};
