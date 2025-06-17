"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
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
    revalidatePath("/communication/internal");
    return {
      type: "success",
      data: updatedChatInfo,
    };
  } catch (err) {
    return errorHandler(err);
  }
};
