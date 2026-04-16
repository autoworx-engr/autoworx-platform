"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getPusherInstance } from "@/lib/pusher/server";
import { ClientConversationTrack } from "@prisma/client";

const pusher = getPusherInstance();

export default async function sendClientMailOrSMSNotify(
  companyId: number,
  clientConversationTrack?: ClientConversationTrack | null,
) {
  try {
    // Send Mail to user via pusher
    const channelName = `client-notify-${companyId}-${clientConversationTrack?.clientId}`;
    await pusher.trigger(channelName, "client-notify", clientConversationTrack);
    await pusher.trigger(
      `client-notify-${companyId}`,
      "client-notify",
      clientConversationTrack,
    );
    return {
      type: "success",
    };
  } catch (error) {
    console.error(error);
    return errorHandler(error);
  }
}
