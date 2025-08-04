"use server";
import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getDefaultNotificationSettings } from "@/app/(dashboard)/dashboard/settings/notifications/utils/notification-v2";
import {
  EmployeeType,
  NotificationSection,
  NotificationType,
} from "@prisma/client";

type TUpdateNotification = {
  userId: number;
  section?: NotificationSection;
  notificationType?: NotificationType;
  switchKey: "email_enabled" | "push_enabled" | "text_enabled";
  value: boolean;
};

export const updateNotification = async ({
  userId,
  section,
  notificationType,
  switchKey,
  value,
}: TUpdateNotification) => {
  try {
    const findNotificationSettings = await db.notificationSettingsV2.findFirst({
      where: {
        userId,
        section,
        notification_type: notificationType,
      },
    });
    if (!findNotificationSettings) {
      throw new Error("Notification settings not found");
    }
    const updatedNotificationSettings = await db.notificationSettingsV2.update({
      where: {
        id: findNotificationSettings.id,
      },
      data: {
        [switchKey]: value,
      },
    });
    // return { type: "success", data: updatedNotificationSettings };
    // TODO: Implement the logic to update the notification settings. Skip for now.
    return { type: "success", data: updatedNotificationSettings };
  } catch (err: any) {
    throw new Error(err);
  }
};

export const uploadNotificationSettings = async (
  userId: number,
  userRole: EmployeeType,
  companyId: number,
) => {
  try {
    const findNotificationCount = await db.notificationSettingsV2.count({
      where: {
        userId,
        companyId,
      },
    });

    const notificationSettings = getDefaultNotificationSettings(userRole);

    if (findNotificationCount === notificationSettings?.length) {
      return;
    } else if (findNotificationCount > notificationSettings?.length) {
      await db.notificationSettingsV2.deleteMany({
        where: {
          userId,
          companyId,
          notification_type: {
            notIn: notificationSettings.map(
              (notification) => notification.notification_type,
            ),
          },
        },
      });
      return;
    }

    await Promise.all(
      notificationSettings.map(async (notification) => {
        const findNotificationSetting =
          await db.notificationSettingsV2.findFirst({
            where: {
              userId,
              section: notification.section,
              notification_type: notification.notification_type,
            },
          });

        if (findNotificationSetting) {
          return;
        }

        await db.notificationSettingsV2.create({
          data: {
            userId,
            section: notification.section,
            notification_type: notification.notification_type,
            companyId,
            email_enabled: notification.email_enabled,
            push_enabled: notification.push_enabled,
          },
        });
      }),
    );
  } catch (err) {
    return errorHandler(err);
  }
};
