"use server";
import { db } from "@/lib/db";
import { NotificationSection } from "@prisma/client";

type TProps = {
  section: NotificationSection;
  userId: number;
  companyId: number;
};

export const getNotificationSettingsByCategory = async ({
  section,
  userId,
  companyId,
}: TProps) => {
  try {
    const notificationSettings = await db.notificationSettingsV2.findMany({
      where: {
        userId,
        companyId,
        section,
      },
    });
    return notificationSettings;
  } catch (err) {
    throw err;
  }
};
