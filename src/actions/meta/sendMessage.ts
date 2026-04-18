"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import getUser from "@/lib/getUser";
import { getPusherInstance } from "@/lib/pusher/server";
import { revalidatePath } from "next/cache";

const GRAPH = "https://graph.facebook.com/v21.0";

const pusher = getPusherInstance();

export async function sendMetaMessage({
  clientId,
  message,
  platform,
  attachments = [],
}: {
  clientId: number;
  message: string;
  platform: "INSTAGRAM" | "FACEBOOK";
  attachments?: { url: string; name?: string; type?: string }[];
}) {
  try {
    const companyId = await getCompanyId();
    const user = await getUser();

    const metaCredentials = await db.metaCredentials.findFirst({
      where: { companyId, isActive: true },
    });

    if (!metaCredentials) {
      return {
        success: false,
        message: "Meta integration is not set up yet!",
      };
    }

    const client = await db.client.findFirst({
      where: { id: clientId },
      include: {
        Lead: {
          select: { id: true, columnId: true },
        },
      },
    });

    if (!client?.metaSenderId) {
      return {
        success: false,
        message: "Client does not have a linked Meta account.",
      };
    }

    const pageToken = decrypt(metaCredentials.pageAccessToken);
    const recipientId = client.metaSenderId;

    // Send text message (if any)
    let metaMessageId: string | undefined;
    if (message?.trim()) {
      const textRes = await fetch(
        `${GRAPH}/me/messages?access_token=${pageToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
          }),
        },
      );
      const textData = (await textRes.json()) as {
        message_id?: string;
        error?: unknown;
      };
      if (textData.error) {
        console.error("Meta send text error:", textData.error);
        throw new Error("Failed to send message via Meta");
      }
      metaMessageId = textData.message_id;
    }

    // Send each attachment as a separate Meta API call
    const sentAttachmentIds: string[] = [];
    for (const att of attachments) {
      const attType = att.type ?? "file";
      const attRes = await fetch(
        `${GRAPH}/me/messages?access_token=${pageToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: {
              attachment: {
                type: attType,
                payload: { url: att.url, is_reusable: true },
              },
            },
          }),
        },
      );
      const attData = (await attRes.json()) as {
        message_id?: string;
        error?: unknown;
      };
      if (attData.message_id) sentAttachmentIds.push(attData.message_id);
    }

    // Save to DB
    const dbMessage = await db.clientMetaMessage.create({
      data: {
        message: message ?? "",
        platform,
        metaMessageId,
        metaSenderId: recipientId,
        sentBy: "Company",
        isRead: true,
        userId: user?.id,
        clientId,
        companyId,
      },
    });

    // Save attachments
    const processedAttachments = [];
    for (const att of attachments) {
      const saved = await db.clientMetaAttachments.create({
        data: {
          clientMetaMessageId: dbMessage.id,
          url: att.url,
          name: att.name,
          type: att.type,
        },
      });
      processedAttachments.push(saved);
    }

    // Update conversation track (mirrors updateNewSMSChatTrack for outgoing)
    await updateMetaChatTrackOutgoing({
      clientId,
      metaLastMessage: message ?? "",
      metaLastPlatform: platform,
      attachments: processedAttachments,
    });

    // Fetch the full saved message with attachments for Pusher payload
    const data = await db.clientMetaMessage.findFirst({
      where: { id: dbMessage.id },
      include: { attachments: true },
    });

    // Pusher: real-time delivery to the open chat
    await pusher.trigger(`meta-${companyId}-${clientId}`, "meta", data);

    revalidatePath("/dashboard/communication/client");

    return { success: true, data };
  } catch (error) {
    console.error("Error sending Meta message:", error);
    return { success: false, error };
  }
}

// Mirror of updateNewSMSChatTrack for outgoing meta messages
async function updateMetaChatTrackOutgoing({
  clientId,
  metaLastMessage,
  metaLastPlatform,
  attachments = [],
}: {
  clientId: number;
  metaLastMessage: string;
  metaLastPlatform: string;
  attachments?: { type?: string | null; url: string }[];
}) {
  const finalMessage =
    metaLastMessage ||
    (attachments.length > 0 ? `${attachments.length} attachment(s)` : "");

  const existing = await db.clientConversationTrack.findUnique({
    where: { clientId },
  });

  if (!existing) {
    return db.clientConversationTrack.create({
      data: {
        clientId,
        emailLastMessage: "",
        smsLastMessage: "",
        metaLastMessage: finalMessage,
        metaIsRead: true,
        metaUnReadCount: 0,
        metaLastPlatform,
        lastMessageBy: "Company",
        sendAt: new Date(),
      },
    });
  }

  return db.clientConversationTrack.update({
    where: { clientId },
    data: {
      metaLastMessage: finalMessage,
      metaIsRead: true,
      // Outgoing: do not increment unread count, matches SMS pattern
      lastMessageBy: "Company",
      metaLastPlatform,
      sendAt: new Date(),
    },
  });
}
