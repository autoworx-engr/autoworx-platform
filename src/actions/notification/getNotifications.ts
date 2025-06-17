"use server";

import { ServerAction } from "@/types/action";
import { db } from "../../lib/db";
import { TErrorHandler } from "@/types/globalError";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

type TNotificationProps = {
  userId: number;
  limit?: number;
};

export async function getNotifications({
  userId,
  limit = 100,
}: TNotificationProps): Promise<ServerAction | TErrorHandler> {
  try {
    const notifications = await db.notification.findMany({
      where: {
        userId: userId,
      },
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const notificationCount = await db.notification.count({
      where: {
        userId: userId,
        isUnRead: true,
      },
    });

    return {
      type: "success",
      data: {
        notifications,
        count: notificationCount,
      },
    };
  } catch (err) {
    return errorHandler(err);
  }
}
