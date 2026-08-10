"use server";
import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getDefaultNotificationSettings } from "@/app/(dashboard)/dashboard/settings/notifications/utils/notification-v2";
import getUser from "@/lib/getUser";
import {
  EmployeeType,
  NotificationSection,
  NotificationType,
  Prisma,
} from "@prisma/client";

type TUpdateNotification = {
  section?: NotificationSection;
  notificationType?: NotificationType;
  switchKey: "email_enabled" | "push_enabled" | "text_enabled";
  value: boolean;
};

export const updateNotification = async ({
  section,
  notificationType,
  switchKey,
  value,
}: TUpdateNotification) => {
  try {
    const user = await getUser();
    const findNotificationSettings = await db.notificationSettingsV2.findFirst({
      where: {
        userId: user.id,
        section,
        notification_type: notificationType,
      },
    });
    if (!findNotificationSettings) {
      throw new Error("Notification settings not found");
    }
    const updatedNotificationSettings = await db.notificationSettingsV2.update({
      where: { id: findNotificationSettings.id },
      data: { [switchKey]: value },
    });
    return { type: "success", data: updatedNotificationSettings };
  } catch (err: any) {
    throw new Error(err);
  }
};

export const uploadNotificationSettings = async (
  userId: number,
  userRole: EmployeeType,
  companyId: number,
  tx?: Prisma.TransactionClient,
) => {
  const client = tx ?? db;
  try {
    const findNotificationCount = await client.notificationSettingsV2.count({
      where: {
        userId,
        companyId,
      },
    });

    const notificationSettings = getDefaultNotificationSettings(userRole);

    if (findNotificationCount === notificationSettings?.length) {
      return;
    } else if (findNotificationCount > notificationSettings?.length) {
      await client.notificationSettingsV2.deleteMany({
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

    const existingSettings = await client.notificationSettingsV2.findMany({
      where: { userId, companyId },
      select: { notification_type: true },
    });
    const existingTypes = new Set(
      existingSettings.map((s) => s.notification_type),
    );
    const missing = notificationSettings.filter(
      (n) => !existingTypes.has(n.notification_type),
    );
    if (missing.length > 0) {
      await client.notificationSettingsV2.createMany({
        data: missing.map((notification) => ({
          userId,
          section: notification.section,
          notification_type: notification.notification_type,
          companyId,
          email_enabled: notification.email_enabled,
          push_enabled: notification.push_enabled,
        })),
      });
    }
  } catch (err) {
    return errorHandler(err);
  }
};
