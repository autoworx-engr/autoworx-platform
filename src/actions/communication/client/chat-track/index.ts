"use server";
import { db } from "@/lib/db";
import { getManualUnreadChannels } from "./manualUnread";

type AttachmentSummary = { name?: string; url?: string };

// Helper function to create descriptive attachment message
function createAttachmentMessage(
  attachments: AttachmentSummary[],
  textMessage?: string,
): string {
  if (!attachments || attachments.length === 0) {
    return textMessage || "";
  }

  // Count images vs other files
  const images = attachments.filter(
    (att) =>
      att.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
      att.url?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i),
  );
  const otherFiles = attachments.filter(
    (att) =>
      !att.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) &&
      !att.url?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i),
  );

  const parts = [];

  if (images.length > 0) {
    parts.push(images.length === 1 ? "1 image" : `${images.length} images`);
  }

  if (otherFiles.length > 0) {
    parts.push(
      otherFiles.length === 1 ? "1 file" : `${otherFiles.length} files`,
    );
  }

  const attachmentText = parts.join(", ");

  // If there's both text and attachments, combine them
  if (textMessage && textMessage.trim()) {
    return `${textMessage.trim()} — ${attachmentText}`;
  }

  return attachmentText;
}

type TCreateChatTrack = {
  clientId: number;
  emailLastMessage: string;
  smsLastMessage: string;
  smsIsRead: boolean;
  emailIsRead: boolean;
  smsUnReadCount: number;
  emailIsUnReadCount: number;
  lastMessageBy?: string;
  lastEmailBy?: string;
};

export async function initialCreateClientChatTrack(clientId: number) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!findClientChatTrack) {
      return await db.clientConversationTrack.create({
        data: {
          clientId: clientId,
          emailLastMessage: "",
          smsLastMessage: "",
        },
      });
    }
  } catch (err) {
    throw err;
  }
}

export async function CreateClientChatTrack(
  clientId: number,
  data: TCreateChatTrack,
) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!findClientChatTrack) {
      const createData = {
        clientId: clientId,
        emailLastMessage: data.emailLastMessage,
        smsLastMessage: data.smsLastMessage,
        smsIsRead: data.smsIsRead,
        emailIsRead: data.emailIsRead,
        smsUnReadCount: data.smsUnReadCount,
        emailIsUnReadCount: data.emailIsUnReadCount,
        lastMessageBy: data.lastMessageBy,
        lastEmailBy: data.lastEmailBy,
      };
      return await db.clientConversationTrack.create({
        data: { ...createData },
      });
    }
  } catch (err) {
    throw err;
  }
}

type TUpdateClientEmailChatTrack = {
  clientId: number;
  emailLastMessage: string;
  lastEmailBy: string; // Who sent the email (Company or Client)
  attachments?: AttachmentSummary[]; // Array of attachments to create descriptive message
};

// update client email conversation track
export async function updateNewEmailChatTrack({
  clientId,
  emailLastMessage,
  lastEmailBy,
  attachments = [],
}: TUpdateClientEmailChatTrack) {
  try {
    const getChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });

    // Create descriptive message
    const finalMessage = createAttachmentMessage(attachments, emailLastMessage);

    if (!getChatTrack) {
      return CreateClientChatTrack(clientId, {
        clientId,
        emailLastMessage: finalMessage,
        smsLastMessage: "",
        smsIsRead: true,
        emailIsRead: lastEmailBy === "Company" ? true : false,
        smsUnReadCount: 0,
        emailIsUnReadCount: lastEmailBy === "Company" ? 0 : 1,
        lastEmailBy,
      });
    }
    const updatedData = await db.clientConversationTrack.update({
      where: { clientId: clientId },
      data: {
        emailLastMessage: finalMessage,
        emailIsRead: lastEmailBy === "Company" ? true : false,
        sendAt: new Date().toISOString(),
        emailIsUnReadCount: {
          increment: lastEmailBy === "Company" ? 0 : 1,
        },
        lastEmailBy,
      },
    });
    return updatedData;
  } catch (err) {
    throw err;
  }
}

// update client sms conversation track
type TUpdateClientSMSChatTrack = {
  clientId: number;
  smsLastMessage: string;
  lastMessageBy: string;
  attachments?: AttachmentSummary[]; // Array of attachments to create descriptive message
};

export async function updateNewSMSChatTrack({
  clientId,
  smsLastMessage,
  lastMessageBy,
  attachments = [],
}: TUpdateClientSMSChatTrack) {
  try {
    const getChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });

    // Create descriptive message
    const finalMessage = createAttachmentMessage(attachments, smsLastMessage);

    if (!getChatTrack) {
      return CreateClientChatTrack(clientId, {
        clientId,
        emailLastMessage: "",
        smsLastMessage: finalMessage,
        smsIsRead: lastMessageBy === "Company" ? true : false,
        emailIsRead: true,
        smsUnReadCount: lastMessageBy === "Company" ? 0 : 1,
        emailIsUnReadCount: 0,
        lastMessageBy,
      });
    }
    const updatedData = await db.clientConversationTrack.update({
      where: { clientId },
      data: {
        smsLastMessage: finalMessage,
        smsIsRead: lastMessageBy === "Company" ? true : false,
        sendAt: new Date().toISOString(),
        smsUnReadCount: {
          increment: lastMessageBy === "Company" ? 0 : 1,
        },
        lastMessageBy,
      },
    });
    return updatedData;
  } catch (err) {
    throw err;
  }
}

// read client sms conversation track
export async function readClientSMS(clientId: number) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!findClientChatTrack) {
      return initialCreateClientChatTrack(clientId);
    }
    // A thread marked unread by hand has no count to clear, so gate on the
    // read flag as well — otherwise opening it would never mark it read.
    const updatedData =
      findClientChatTrack.smsUnReadCount || !findClientChatTrack.smsIsRead
        ? await db.clientConversationTrack.update({
            where: { clientId },
            data: {
              smsIsRead: true,
              smsUnReadCount: 0,
            },
          })
        : findClientChatTrack;
    return updatedData;
  } catch (err) {
    throw err;
  }
}

// read client email conversation track
export async function readClientEmail(clientId: number) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!findClientChatTrack) {
      return initialCreateClientChatTrack(clientId);
    }
    const updatedData =
      findClientChatTrack.emailIsUnReadCount || !findClientChatTrack.emailIsRead
        ? await db.clientConversationTrack.update({
            where: { clientId },
            data: {
              emailIsRead: true,
              emailIsUnReadCount: 0,
            },
          })
        : findClientChatTrack;
    return updatedData;
  } catch (err) {
    throw err;
  }
}

export async function unreadClientSmsAndEmail(clientId: number) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });

    if (!findClientChatTrack) {
      return initialCreateClientChatTrack(clientId);
    }

    // Marking a thread unread by hand means "remind me", not "a new message
    // arrived" — so leave the counts alone. A count of 0 on an unread channel
    // is what tells the badge to show a plain dot instead of a number, and it
    // keeps a real inbound count from being inflated.
    const channels = getManualUnreadChannels(findClientChatTrack);
    if (channels.sms) {
      await db.clientConversationTrack.updateMany({
        where: { clientId, smsIsRead: true },
        data: {
          smsIsRead: false,
        },
      });
    }

    if (channels.email) {
      await db.clientConversationTrack.updateMany({
        where: { clientId, emailIsRead: true },
        data: {
          emailIsRead: false,
        },
      });
    }

    return db.clientConversationTrack.findUnique({ where: { clientId } });
  } catch (err) {
    throw err;
  }
}

export async function updateNewMessengerChatTrack({
  clientId,
  message,
  sentBy,
}: {
  clientId: number;
  message: string;
  sentBy: string;
}) {
  try {
    const track = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });

    const data = {
      messengerIsRead: sentBy === "Company",
      messengerUnReadCount: sentBy === "Company" ? 0 : undefined,
      messengerLastMessage: message,
      messengerLastBy: sentBy,
      sendAt: new Date(),
    };

    if (!track) {
      return db.clientConversationTrack.create({
        data: {
          clientId,
          messengerIsRead: sentBy === "Company",
          messengerUnReadCount: sentBy === "Company" ? 0 : 1,
          messengerLastMessage: message,
          messengerLastBy: sentBy,
          sendAt: new Date(),
        },
      });
    }

    return db.clientConversationTrack.update({
      where: { clientId },
      data: {
        messengerIsRead: sentBy === "Company",
        messengerUnReadCount: { increment: sentBy === "Company" ? 0 : 1 },
        messengerLastMessage: message,
        messengerLastBy: sentBy,
        sendAt: new Date(),
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function readClientMessenger(clientId: number) {
  try {
    const track = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });
    if (!track) return initialCreateClientChatTrack(clientId);
    if (!track.messengerUnReadCount && track.messengerIsRead) return track;
    return db.clientConversationTrack.update({
      where: { clientId },
      data: { messengerIsRead: true, messengerUnReadCount: 0 },
    });
  } catch (err) {
    throw err;
  }
}

export async function updateNewInstagramChatTrack({
  clientId,
  message,
  sentBy,
}: {
  clientId: number;
  message: string;
  sentBy: string;
}) {
  try {
    const track = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });

    if (!track) {
      return db.clientConversationTrack.create({
        data: {
          clientId,
          instagramIsRead: sentBy === "Company",
          instagramUnReadCount: sentBy === "Company" ? 0 : 1,
          instagramLastMessage: message,
          instagramLastBy: sentBy,
          sendAt: new Date(),
        },
      });
    }

    return db.clientConversationTrack.update({
      where: { clientId },
      data: {
        instagramIsRead: sentBy === "Company",
        instagramUnReadCount: { increment: sentBy === "Company" ? 0 : 1 },
        instagramLastMessage: message,
        instagramLastBy: sentBy,
        sendAt: new Date(),
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function readClientInstagram(clientId: number) {
  try {
    const track = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });
    if (!track) return initialCreateClientChatTrack(clientId);
    if (!track.instagramUnReadCount && track.instagramIsRead) return track;
    return db.clientConversationTrack.update({
      where: { clientId },
      data: { instagramIsRead: true, instagramUnReadCount: 0 },
    });
  } catch (err) {
    throw err;
  }
}

export async function readClientSmsAndEmail(clientId: number) {
  try {
    const findClientChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId },
    });

    if (!findClientChatTrack) {
      return initialCreateClientChatTrack(clientId);
    }

    const updatedData = await db.clientConversationTrack.update({
      where: { clientId },
      data: {
        smsIsRead: true,
        smsUnReadCount: 0,
        emailIsRead: true,
        emailIsUnReadCount: 0,
      },
    });

    return updatedData;
  } catch (err) {
    throw err;
  }
}
