"use server";
import { db } from "@/lib/db";

type TCreateChatTrack = {
  clientId: number;
  emailLastMessage: string;
  smsLastMessage: string;
  smsIsRead: boolean;
  emailIsRead: boolean;
  smsUnReadCount: number;
  emailIsUnReadCount: number;
  lastMessageBy: string;
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
  data: TCreateChatTrack
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
  lastMessageBy: string;
};

// update client email conversation track
export async function updateNewEmailChatTrack({
  clientId,
  emailLastMessage,
  lastMessageBy,
}: TUpdateClientEmailChatTrack) {
  try {
    const getChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!getChatTrack) {
      return CreateClientChatTrack(clientId, {
        clientId,
        emailLastMessage,
        smsLastMessage: "",
        smsIsRead: true,
        emailIsRead: lastMessageBy === "Company" ? true : false,
        smsUnReadCount: 0,
        emailIsUnReadCount: lastMessageBy === "Company" ? 0 : 1,
        lastMessageBy,
      });
    }
    const updatedData = await db.clientConversationTrack.update({
      where: { clientId: clientId },
      data: {
        emailLastMessage,
        emailIsRead: lastMessageBy === "Company" ? true : false,
        sendAt: new Date().toISOString(),
        emailIsUnReadCount: {
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

// update client sms conversation track
type TUpdateClientSMSChatTrack = {
  clientId: number;
  smsLastMessage: string;
  lastMessageBy: string;
};

export async function updateNewSMSChatTrack({
  clientId,
  smsLastMessage,
  lastMessageBy,
}: TUpdateClientSMSChatTrack) {
  try {
    const getChatTrack = await db.clientConversationTrack.findUnique({
      where: { clientId: clientId },
    });
    if (!getChatTrack) {
      return CreateClientChatTrack(clientId, {
        clientId,
        emailLastMessage: "",
        smsLastMessage,
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
        smsLastMessage,
        smsIsRead: lastMessageBy === "Company" ? true : false,
        sendAt: new Date().toISOString(),
        smsUnReadCount: {
          increment: lastMessageBy === "Company" ? 0 : 1,
        },
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
    const updatedData = !findClientChatTrack?.smsIsRead
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
    const updatedData = !findClientChatTrack?.emailIsRead
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

    const updatedData = await db.clientConversationTrack.update({
      where: { clientId },
      data: {
        smsIsRead: false,
        smsUnReadCount: { increment: 1 }, // or set to specific number
        emailIsRead: false,
        emailIsUnReadCount: { increment: 1 }, // or set to specific number
      },
    });

    return updatedData;
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
