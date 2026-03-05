import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { revalidatePath } from "next/cache";

const pusher = getPusherInstance();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fromCompanyId,
      toCompanyId,
      message,
      attachmentFiles,
      requestEstimateId,
      senderUserId,
    } = body;

    if (!fromCompanyId || !toCompanyId) {
      throw new Error("Missing company IDs");
    }

    if (!message && !attachmentFiles && !requestEstimateId) {
      throw new Error("Message content missing");
    }

    const createdMessage = await db.collaborationMessage.create({
      data: {
        fromCompanyId,
        toCompanyId,
        senderUserId,
        message,
        section: "collaboration",
        requestEstimateId: requestEstimateId || null,
      },
    });

    let attachments = null;

    if (attachmentFiles?.length) {
      const updatedMessage = await db.collaborationMessage.update({
        where: { id: createdMessage.id },
        data: {
          attachment: {
            create: attachmentFiles.map((file: any) => ({
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              fileSize: `${(file.fileSize / 1024 / 1024).toPrecision(2)} MB`,
            })),
          },
        },
        include: { attachment: true },
      });

      attachments = updatedMessage.attachment;
    }

    /* ---------------- COMPANY CHAT TRACK ---------------- */

    const existingTrack = await db.companyChatTrack.findFirst({
      where: {
        OR: [
          {
            AND: [
              { senderCompanyId: fromCompanyId },
              { receiverCompanyId: toCompanyId },
            ],
          },
          {
            AND: [
              { senderCompanyId: toCompanyId },
              { receiverCompanyId: fromCompanyId },
            ],
          },
        ],
      },
    });

    let chatTrack;

    if (existingTrack) {
      chatTrack = await db.companyChatTrack.update({
        where: { id: existingTrack.id },
        data: {
          lastMessage: message || "Attachment",
          messageId: createdMessage.id,
          senderCompanyId: fromCompanyId,
          receiverCompanyId: toCompanyId,
          isRead: false,
        },
      });
    } else {
      chatTrack = await db.companyChatTrack.create({
        data: {
          senderCompanyId: fromCompanyId,
          receiverCompanyId: toCompanyId,
          lastMessage: message || "Attachment",
          messageId: createdMessage.id,
          isRead: false,
        },
      });
    }

    const payload = {
      fromCompanyId,
      toCompanyId,
      senderUserId,
      message,
      attachment: attachments,
      requestEstimateId,
      createdAt: createdMessage.createdAt,
    };

    // Send to receiver company channel
    await pusher.trigger(`company-${toCompanyId}`, "message", payload);

    // Update chat list for both companies
    await pusher.trigger(
      `company-track-${fromCompanyId}`,
      "chat-track",
      chatTrack,
    );

    await pusher.trigger(
      `company-track-${toCompanyId}`,
      "chat-track",
      chatTrack,
    );

    revalidatePath("/dashboard/communication/collaboration");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company message sent",
      }),
      { status: 200 },
    );
  } catch (e) {
    const formattedError = errorHandler(e);
    console.error("error", e);
    return new Response(
      JSON.stringify({
        success: false,
        message: formattedError?.message,
      }),
      { status: formattedError?.statusCode || 500 },
    );
  }
}
