import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
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
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const body = await request.json();
    const { chatTrackId, isRead, lastMessage } = body;

    if (!chatTrackId) {
      throw new AppError(400, "ChatTrack ID is required");
    }

    // Caller must be a party to this chatTrack.
    const existing = await db.chatTrack.findFirst({
      where: {
        id: chatTrackId,
        OR: [{ senderId: principal.userId }, { receiverId: principal.userId }],
      },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "Chat track not found");

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

/**
 * @swagger
 * /api/communication/internal/chatTrack:
 *   post:
 *     summary: Create or retrieve a chat track
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - receiverId
 *             properties:
 *               senderId:
 *                 type: integer
 *                 description: ID of the sender
 *               receiverId:
 *                 type: integer
 *                 description: ID of the receiver
 *               lastMessage:
 *                 type: string
 *                 description: Initial message content
 *               isRead:
 *                 type: boolean
 *                 description: Initial read status
 *     responses:
 *       200:
 *         description: Chat track created or retrieved successfully
 *       400:
 *         description: Sender ID and Receiver ID are required
 *       500:
 *         description: Internal Server Error
 */
export const POST = async (request: NextRequest) => {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const body = await request.json();
    const { senderId, receiverId, lastMessage, isRead } = body;

    if (!senderId || !receiverId) {
      throw new AppError(400, "Sender ID and Receiver ID are required");
    }

    // Caller must be one of the two parties on the track.
    if (
      Number(senderId) !== principal.userId &&
      Number(receiverId) !== principal.userId
    ) {
      throw new AppError(403, "Forbidden");
    }

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
          lastMessage: lastMessage ?? "",
          isRead: isRead ?? false,
          section: "internal",
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: newChatTrack,
          message: "Chat track created successfully",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: chatTrack,
        message: "Chat track retrieved successfully",
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
