import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { revalidatePath } from "next/cache";
import { sendCollaborationMessageNotification } from "@/lib/notification/communication-notify";

/**
 * @swagger
 * /api/pusher/collaboration:
 *   post:
 *     summary: Send collaboration message between companies
 *     description: Sends a message, attachment, or estimate request between two companies and triggers realtime events.
 *     tags:
 *       - Collaboration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromCompanyId
 *               - toCompanyId
 *               - senderUserId
 *             properties:
 *               fromCompanyId:
 *                 type: integer
 *                 example: 1
 *                 description: Sender company ID
 *               toCompanyId:
 *                 type: integer
 *                 example: 5
 *                 description: Receiver company ID
 *               senderUserId:
 *                 type: integer
 *                 example: 22
 *                 description: User ID of sender
 *               message:
 *                 type: string
 *                 example: "Hello, we need a price estimate."
 *                 description: Text message content
 *               requestEstimateId:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *                 description: Linked estimate request ID
 *               attachmentFiles:
 *                 type: array
 *                 description: Optional file attachments
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                       example: invoice.pdf
 *                     fileType:
 *                       type: string
 *                       example: application/pdf
 *                     fileUrl:
 *                       type: string
 *                       example: https://cdn.domain.com/files/invoice.pdf
 *                     fileSize:
 *                       type: number
 *                       example: 245678
 *                       description: File size in bytes
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Company message sent
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Missing company IDs
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */

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
      include: {
        requestEstimate: true,
        senderUser: true,
        attachment: true,
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

    let chatTrack;

    if (createdMessage?.id) {
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

    const payloadFrom = {
      fromCompanyId,
      toCompanyId,
      senderUserId,
      message,
      attachments: attachments,
      requestEstimateId,
      requestEstimate: createdMessage?.requestEstimate,
      senderUser: createdMessage.senderUser,
      createdAt: createdMessage.createdAt,
      isOwnMessage: fromCompanyId === createdMessage?.fromCompanyId,
    };
    const payloadTo = {
      fromCompanyId,
      toCompanyId,
      senderUserId,
      message,
      attachments: attachments,
      requestEstimateId,
      requestEstimate: createdMessage?.requestEstimate,
      senderUser: createdMessage.senderUser,
      createdAt: createdMessage.createdAt,
      isOwnMessage: false,
    };

    // Send to receiver company channel

    await pusher.trigger(`company-${fromCompanyId}`, "message", payloadFrom);

    await pusher.trigger(`company-${toCompanyId}`, "message", payloadTo);

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

    if (toCompanyId) {
      sendCollaborationMessageNotification({
        companyId: toCompanyId,
      });
    }

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
    return new Response(
      JSON.stringify({
        success: false,
        message: formattedError?.message,
      }),
      { status: formattedError?.statusCode || 500 },
    );
  }
}
