"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getPusherInstance } from "@/lib/pusher/server";
import { ClientSMS, ClientSmsAttachments } from "@prisma/client";

const pusher = getPusherInstance();

export default async function receiveTwiloMessage(
  clientSMS: ClientSMS & { attachments?: ClientSmsAttachments[] | [] },
) {
  try {
    // Send Mail to user via pusher
    const channelName = `sms-${clientSMS.companyId}-${clientSMS.clientId}`;
    await pusher.trigger(channelName, "sms", clientSMS);
    return {
      type: "success",
    };
  } catch (error) {
    console.error(error);
    return errorHandler(error);
  }
}
