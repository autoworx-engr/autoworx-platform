import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

export async function updateChatTrackHandler(request: NextRequest) {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const body = await request.json();
    const { chatTrackId, isRead, lastMessage } = body;

    if (!chatTrackId) {
      throw new AppError(400, "ChatTrack ID is required");
    }

    // Caller must be a party to this chatTrack AND it must belong to the
    // internal section — otherwise this endpoint could be used to mutate a
    // collaboration track simply because the caller is on it.
    const existing = await db.chatTrack.findFirst({
      where: {
        id: chatTrackId,
        section: "internal",
        OR: [{ senderId: principal.userId }, { receiverId: principal.userId }],
      },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "Chat track not found");

    // updateMany (scoped by id + section) so a race-condition section flip
    // can't slip past the read-then-write gap above. Then fetch the row to
    // return the updated payload.
    const updateResult = await db.chatTrack.updateMany({
      where: { id: chatTrackId, section: "internal" },
      data: { isRead, lastMessage },
    });
    if (updateResult.count === 0) {
      throw new AppError(404, "Chat track not found");
    }
    const updatedChatInfo = await db.chatTrack.findUniqueOrThrow({
      where: { id: chatTrackId },
      include: { message: true },
    });

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
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
