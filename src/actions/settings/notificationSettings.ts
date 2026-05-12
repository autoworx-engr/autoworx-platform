"use server";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { NotificationSection } from "@prisma/client";

export const getNotificationSettingsByCategory = async (
  section: NotificationSection,
) => {
  const user = await getUser();
  const notificationSettings = await db.notificationSettingsV2.findMany({
    where: {
      userId: user.id,
      companyId: user.companyId,
      section,
    },
  });
  return notificationSettings;
};
