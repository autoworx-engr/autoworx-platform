"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export const markAsAllRead = async function (
  userId: number,
  notificationId?: number[],
): Promise<ServerAction | TErrorHandler> {
  try {
    // update isUnRead notification to database
    const queryWithNotificationId = notificationId
      ? { in: notificationId }
      : undefined;
    await db.notification.updateMany({
      where: {
        userId: userId,
        id: queryWithNotificationId,
      },
      data: {
        isUnRead: false,
      },
    });

    return {
      type: "success",
    };
  } catch (error) {
    return errorHandler(error);
  }
};

export const markAsReadById = async function (
  notificationId: number,
): Promise<ServerAction | TErrorHandler> {
  try {
    // const currentUsers = await getUserFromSession();
    // update isUnRead notification to database
    const updatedNotification = await db.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isUnRead: false,
      },
    });
    // const response = await getNotifications({
    //   userId: parseInt(currentUsers.id),
    // });
    return {
      type: "success",
      data: updatedNotification,
    };
  } catch (error) {
    return errorHandler(error);
  }
};
