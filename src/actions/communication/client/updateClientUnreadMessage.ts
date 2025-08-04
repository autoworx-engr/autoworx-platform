"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export const updateClientUnreadMessageToRead = async (
  clientId: number,
): Promise<ServerAction | TErrorHandler> => {
  try {
    await db.clientSMS.updateMany({
      where: {
        clientId,
        sentBy: "Client",
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return { type: "success" };
  } catch (err) {
    return errorHandler(err);
  }
};
