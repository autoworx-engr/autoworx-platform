import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";
const pusher = getPusherInstance();

/**
 * @swagger
 * /api/communication/internal/chatTrack:
 *   put:
 *     summary: Update chat track status and last message
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatTrackId
 *             properties:
 *               chatTrackId:
 *                 type: string
 *                 description: The ID of the chat track to update
 *               isRead:
 *                 type: boolean
 *                 description: Whether the chat track is marked as read
 *               lastMessage:
 *                 type: string
 *                 description: The content of the last message
 *     responses:
 *       200:
 *         description: Chat track updated successfully
 *       400:
 *         description: ChatTrack ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const PUT = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { chatTrackId, isRead, lastMessage } = body;

    if (!chatTrackId) {
      throw new AppError(400, "ChatTrack ID is required");
    }

    const updatedChatInfo = await db.chatTrack.update({
      where: {
        id: chatTrackId,
      },
      data: {
        isRead: isRead,
        lastMessage: lastMessage,
      },
      include: {
        message: true,
      },
    });

    // Trigger Pusher event to notify other components that messages were read

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

    return NextResponse.json(
      {
        success: true,
        data: updatedChatInfo,
        message: "Chat track updated successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
};
