import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

export async function upsertChatTrackHandler(request: NextRequest) {
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

    // Scope by section so an existing collaboration row isn't returned to an
    // internal POST.
    const chatTrack = await db.chatTrack.findFirst({
      where: {
        section: "internal",
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (!chatTrack) {
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
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
