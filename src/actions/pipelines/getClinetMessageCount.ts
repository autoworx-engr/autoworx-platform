"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

export const getClientMessageCount = async (
  clientId: number,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const messageCount = await db.clientSMS.count({
      where: {
        clientId,
        sentBy: "Client",
        isRead: false,
      },
    });
    // const emailCount = await db.mailgunEmail.count({
    //   where: {
    //     clientId,
    //     emailBy: "Client",

    //   },
    // });
    return { type: "success", data: { count: messageCount } };
  } catch (err) {
    return errorHandler(err);
  }
};
