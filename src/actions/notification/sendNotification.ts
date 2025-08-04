"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "../../lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getPusherInstance } from "@/lib/pusher/server";

const pusher = getPusherInstance();

type TSendNotification = {
  userId: number;
  title: string;
  description: string;
  companyId?: number;
  type?: string;
  avatarUrl?: string;
  redirectUrl?: string;
};

// this is for global notification
export async function sendNotification({
  userId,
  title,
  description,
  companyId,
  type,
  avatarUrl,
  redirectUrl,
}: TSendNotification): Promise<ServerAction | TErrorHandler> {
  try {
    const cId = companyId ? companyId : await getCompanyId();

    // Save notification to database
    const newNotification = await db.notification.create({
      data: {
        userId,
        title,
        type,
        description,
        avatarUrl,
        redirectUrl,
        companyId: cId,
      },
    });
    // TODO: Send notification to user via pusher
    const channelName = `noti-${userId}`;
    await pusher.trigger(channelName, "notification", newNotification);
    return {
      type: "success",
      data: newNotification,
    };
  } catch (error) {
    console.error(error);
    return errorHandler(error);
  }
}
