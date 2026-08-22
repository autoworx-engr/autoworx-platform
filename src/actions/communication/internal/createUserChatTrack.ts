"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { revalidatePath } from "next/cache";

type TCreateChatTrack = {
  senderId?: number;
  receiverId?: number;
};

export const createUserChatTrack = async ({
  senderId,
  receiverId,
}: TCreateChatTrack): Promise<ServerAction | TErrorHandler> => {
  try {
    // find the initial chat track exist in db
    const chatTrack = await db.chatTrack.findFirst({
      where: {
        OR: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
    if (!chatTrack) {
      // create a new chat track
      const newChatTrack = await db.chatTrack.create({
        data: {
          senderId,
          receiverId,
          lastMessage: "",
          isRead: false,
          section: "internal",
        },
      });
      revalidatePath("/communication/internal");
      return {
        type: "success",
        data: newChatTrack,
      };
    }
    return {
      type: "success",
      data: chatTrack,
    };
  } catch (err) {
    return errorHandler(err);
  }
};
