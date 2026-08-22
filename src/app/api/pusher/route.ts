import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import {
  sendCollaborationMessageNotification,
  sendInternalMessageNotification,
} from "@/lib/notification/communication-notify";
import { sendInternalGroupMessageNotification } from "@/lib/notification/internal-group-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { sendType } from "@/types/Chat";
import { MessageSection } from "@prisma/client";
import { revalidatePath } from "next/cache";

type TMessageDate = {
  from: number;
  to?: number;
  groupId?: number;
  message: string;
  section?: MessageSection;
  requestEstimateId?: number;
};

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/pusher:
 *   post:
 *     summary: Send a real-time message
 *     description: Dispatches a message via Pusher, updates chat history, and triggers relevant notifications.
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: integer
 *                 description: Recipient user ID or group ID.
 *               sessionUserId:
 *                 type: integer
 *                 description: Sender user ID.
 *               message:
 *                 type: string
 *                 description: Text content of the message.
 *               type:
 *                 type: string
 *                 description: The type of message being sent.
 *                 example: USER,GROUP
 *               section:
 *                 type: string
 *                 enum: [INTERNAL, COLLABORATION]
 *                 description: The section context for the message.
 *               attachmentFiles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     fileType:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                 description: Optional array of file attachments.
 *               requestEstimate:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                 description: Optional associated estimate request.
 *     responses:
 *       200:
 *         description: Message sent successfully.
 *       400:
 *         description: Bad request - missing required arguments.
 *       401:
 *         description: Unauthorized - valid session required.
 *       500:
 *         description: Internal server error.
 */

export async function POST(req: Request) {
  const body = await req.json();
  const {
    to,
    message,
    type,
    section,
    attachmentFiles,
    requestEstimate,
    sessionUserId,
  } = body;
  try {
    const userId = parseInt(sessionUserId);

    if (!userId) {
      throw new Error("Missing Session User ID");
    }

    if (!to || (!message && !attachmentFiles && !requestEstimate)) {
      throw new Error("Missing some argument for message");
    }

    // Helper function to generate lastMessage text
    const generateLastMessageText = (
      message: string,
      attachmentFiles: any[] | null,
    ) => {
      // If there's a text message, use it
      if (message && message.trim()) {
        return message;
      }

      // If there are attachments but no text message, generate descriptive text
      if (attachmentFiles && attachmentFiles.length > 0) {
        const imageCount = attachmentFiles.filter(
          (file) => file.fileType && file.fileType.startsWith("image/"),
        ).length;
        const otherFileCount = attachmentFiles.length - imageCount;

        const parts = [];
        if (imageCount > 0) {
          parts.push(`${imageCount} ${imageCount === 1 ? "image" : "images"}`);
        }
        if (otherFileCount > 0) {
          parts.push(
            `${otherFileCount} ${otherFileCount === 1 ? "file" : "files"}`,
          );
        }

        return parts.join(" and ");
      }

      return message || "";
    };

    let channel = `user-${userId}`;
    let messageData: TMessageDate = {
      from: userId,
      to,
      message,
      section,
      requestEstimateId: requestEstimate ? requestEstimate?.id : null,
    };

    const chatTrackDataCreate = {
      lastMessage: generateLastMessageText(message, attachmentFiles),
      isRead: false,
      senderId: userId,
      receiverId: to as number,
      section,
    };

    // send a message for group
    let groupMemberIds: number[] | null = null;
    if (type === sendType.Group) {
      const isUserInExistGroup = await db.group.findFirst({
        where: {
          id: to,
          users: {
            some: {
              id: userId,
            },
          },
        },
        include: {
          users: { select: { id: true } },
        },
      });
      if (!isUserInExistGroup) {
        return new Response(
          JSON.stringify({
            message: "User is not in the group",
            success: false,
          }),
          { status: 400 },
        );
      }
      channel = `group-${to}`;
      groupMemberIds = isUserInExistGroup.users.map((user) => user.id);
      messageData = {
        from: userId,
        groupId: to,
        message,
        section,
      };
    }

    // Save to the database
    const createdMessage = await db.message.create({
      data: messageData,
    });

    // Touch Group.updatedAt so group list sorts by most recent message activity
    if (type === sendType.Group) {
      await db.group.update({
        where: { id: to },
        data: { updatedAt: new Date() },
      });
    }

    // create chat tracker for track last message
    const isChatTrackExist = await db.chatTrack.findFirst({
      where: {
        OR: [
          {
            AND: [
              { senderId: userId },
              { receiverId: to as number },
              { section: section },
            ],
          },
          {
            AND: [
              { senderId: to as number },
              { receiverId: userId },
              { section: section },
            ],
          },
        ],
      },
    });

    let userChatTrack = null;

    if (type === sendType.User) {
      if (isChatTrackExist) {
        userChatTrack = await db.chatTrack.update({
          where: {
            id: isChatTrackExist?.id,
          },
          data: {
            messageId: createdMessage.id,
            lastMessage: generateLastMessageText(message, attachmentFiles),
            isRead: false,
            section,
            senderId: userId,
            receiverId: to as number,
          },
          include: {
            message: true,
          },
        });
      } else {
        userChatTrack = await db.chatTrack.create({
          data: {
            ...chatTrackDataCreate,
            messageId: createdMessage.id,
          },
          include: {
            message: true,
          },
        });
      }
    }

    let attachments = null;
    // attachment file upload
    if (attachmentFiles) {
      const attachmentFromDB = await db.message.update({
        where: {
          id: createdMessage.id,
        },
        data: {
          attachment: {
            create: attachmentFiles.map((attachmentFile: any) => ({
              fileName: attachmentFile.fileName, // File name (e.g., 'image.png')
              fileType: attachmentFile.fileType, // File type (e.g., 'image/png', 'application/pdf')
              fileUrl: attachmentFile.fileUrl,
              fileSize: `${(attachmentFile.fileSize / 1024 / 1024).toPrecision(2)} MB`,
            })),
          },
        },
        include: {
          attachment: true,
        },
      });
      attachments = attachmentFromDB.attachment;
    }

    // send the raw message to the room
    pusher.trigger(channel, "message", {
      groupId: type === sendType.Group ? to : null,
      to: type !== sendType.Group ? to : null,
      from: userId,
      message,
      section,
      attachment: attachmentFiles
        ? attachmentFiles.map((attachmentFile: any) => ({
            ...attachmentFile,
            fileSize: `${(attachmentFile?.fileSize / 1024 / 1024).toPrecision(2)} MB`,
          }))
        : null,
      requestEstimate: requestEstimate ? requestEstimate : null,
      chatTrack: userChatTrack,
    });
    // send the track last message for the user (sender)
    pusher.trigger(`track-${userId}`, "chat-track", { ...userChatTrack });

    // send the track last message for the receiver as well (for real-time notification updates)
    if (type === sendType.User && to) {
      pusher.trigger(`track-${to}`, "chat-track", { ...userChatTrack });
    }

    if (type === sendType.User && section === "internal") {
      // Send a notification to the user about the new message.
      // Pass the sender id explicitly — mobile app requests have no web session.
      sendInternalMessageNotification({
        toUserId: to,
        fromUserId: userId,
        message: message,
      });
    }

    if (type === sendType.Group && section === "internal" && groupMemberIds) {
      // Send a notification to every group member (except the sender).
      sendInternalGroupMessageNotification({
        groupId: to,
        fromUserId: userId,
        memberIds: groupMemberIds,
      });
    }

    if (type === sendType.User && section === "collaboration" && to) {
      const receiver = await db.user.findUnique({
        where: { id: to },
        select: { companyId: true },
      });

      const company = await db.company.findUnique({
        where: { id: receiver?.companyId },
        select: { name: true, id: true },
      });
      // send collaboration message notification
      // Send a notification to the user about the new message
      if (company) {
        sendCollaborationMessageNotification({
          companyId: company?.id,
          senderUserId: userId,
        });
      }
    }
    revalidatePath("/dashboard/communication/internal");
    revalidatePath("/dashboard/communication/collaboration");
    // send json
    return new Response(
      JSON.stringify({
        success: true,
        message: "Message sent",
        attachments,
        newMessage: createdMessage,
        chatTrack: userChatTrack,
      }),
    );
  } catch (e) {
    const formattedError = errorHandler(e);
    console.error(e);
    return new Response(
      JSON.stringify({
        message: formattedError?.message,
        success: false,
        errorDetails: formattedError,
      }),
      {
        status: formattedError?.statusCode || 500,
      },
    );
  }
}
