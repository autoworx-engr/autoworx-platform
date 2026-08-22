"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";

const pusher = getPusherInstance();

export const updateCollaborationUnreadMessageToRead = async (
  userId: number,
  senderId: number,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const updatedTracks = await db.chatTrack.updateMany({
      where: {
        receiverId: userId,
        senderId: senderId,
        section: "collaboration",
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Trigger real-time update for the receiver to refresh their unread counts
    if (updatedTracks.count > 0) {
      pusher.trigger(`track-${userId}`, "chat-track-read", {
        senderId,
        userId,
        section: "collaboration",
      });
    }

    return { type: "success" };
  } catch (err) {
    return errorHandler(err);
  }
};
