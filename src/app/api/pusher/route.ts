import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { sendInternalMessageNotification } from "@/lib/notification/communication-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { sendType } from "@/types/Chat";
import { MessageSection } from "@prisma/client";
import { getServerSession } from "next-auth";
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

// POST /api/pusher/trigger
// Trigger a message to the client
// Body: { message, roomId }
export async function POST(req: Request) {
  const body = await req.json();
  const { to, message, type, section, attachmentFiles, requestEstimate } = body;
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const userId = parseInt(session.user.id);
    if (!to || (!message && !attachmentFiles && !requestEstimate)) {
      throw new Error("Missing some argument for message");
    }
    let channel = `user-${userId}`;
    let messageData: TMessageDate = {
      from: userId,
      to,
      message,
      section,
      requestEstimateId: requestEstimate ? requestEstimate?.id : null,
    };

    const chatTrackDataCreate = {
      lastMessage: message as string,
      isRead: false,
      senderId: userId,
      receiverId: to as number,
      section,
    };

    // send a message for group
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

    // create chat tracker for track last message
    const isChatTrackExist = await db.chatTrack.findFirst({
      where: {
        OR: [
          { 
            AND: [
              { senderId: userId }, 
              { receiverId: to as number },
              { section: section }
            ]
          },
          { 
            AND: [
              { senderId: to as number }, 
              { receiverId: userId },
              { section: section }
            ]
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
            lastMessage: message as string,
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
      // send message notification
      // Send a notification to the user about the new message
      // Send a notification to the user about the new message
      sendInternalMessageNotification({
        toUserId: to,
        message: message,
      });
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
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ message: "Failed to send message", success: false }),
      {
        status: 500,
      },
    );
  }
}
