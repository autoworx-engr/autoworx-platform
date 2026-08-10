"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

// type TUpdateChatTrack = {
//   senderId: number | null;
//   receiverId: number | null;
// };

export const updateChatTrack = async (
  chatTrackId: number,
): Promise<ServerAction | TErrorHandler> => {
  try {
    const updatedChatInfo = await db.chatTrack.update({
      where: {
        id: chatTrackId,
      },
      data: {
        isRead: true,
      },
      include: {
        message: true,
      },
    });

    // Trigger Pusher event to notify other components that messages were read
    const pusher = getPusherInstance();
    if (updatedChatInfo.senderId && updatedChatInfo.receiverId) {
      // Notify both users involved in the conversation
      await pusher.trigger(
        `track-${updatedChatInfo.senderId}`,
        "chat-track-read",
        {
          senderId: updatedChatInfo.senderId,
          userId: updatedChatInfo.receiverId,
          section: "internal",
        },
      );
      await pusher.trigger(
        `track-${updatedChatInfo.receiverId}`,
        "chat-track-read",
        {
          senderId: updatedChatInfo.senderId,
          userId: updatedChatInfo.receiverId,
          section: "internal",
        },
      );
    }

    revalidatePath("/communication/internal");
    return {
      type: "success",
      data: updatedChatInfo,
    };
  } catch (err) {
    return errorHandler(err);
  }
};
