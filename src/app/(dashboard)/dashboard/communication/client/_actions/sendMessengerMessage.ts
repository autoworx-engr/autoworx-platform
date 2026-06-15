"use server";

import { updateNewMessengerChatTrack } from "@/actions/communication/client/chat-track";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { getPusherInstance } from "@/lib/pusher/server";

type TAttachment = { url: string; name: string; attachmentType: string };

type TArgs = {
  clientId: number;
  message?: string;
  attachments?: TAttachment[];
};

export async function sendMessengerMessage({
  clientId,
  message = "",
  attachments = [],
}: TArgs) {
  const companyId = await getCompanyId();
  const user = await getUser();

  const profile = await db.facebookClientProfile.findFirst({
    where: { clientId },
    include: { facebookPage: true },
  });

  if (!profile) throw new Error("No Facebook profile linked to this client.");
  if (!profile.facebookPage.isActive)
    throw new Error("Facebook page is disconnected.");

  const { psid, facebookPage } = profile;
  const { pageAccessToken, id: facebookPageId } = facebookPage;

  // Build Meta API payload
  const metaPayload: Record<string, unknown> = {
    recipient: { id: psid },
    message: buildMetaMessage(message, attachments),
  };

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload),
    },
  );

  if (!metaRes.ok) {
    const errJson = await metaRes.json().catch(() => ({}));
    const metaError = (errJson as any)?.error;
    if (metaError?.code === 10) {
      throw new Error(
        "The 24-hour messaging window has closed. You can only reply within 24 hours of the client's last message.",
      );
    }
    throw new Error(metaError?.message ?? "Failed to send via Messenger.");
  }

  const metaData = (await metaRes.json()) as { message_id?: string };

  const saved = await db.messengerMessage.create({
    data: {
      companyId,
      clientId,
      facebookPageId,
      mid: metaData.message_id,
      message: message.trim() || null,
      sentBy: "Company",
      isRead: true,
      userId: user.id,
      attachments: attachments.length
        ? {
            create: attachments.map((a) => ({
              url: a.url,
              name: a.name,
              attachmentType: a.attachmentType,
            })),
          }
        : undefined,
    },
    include: {
      attachments: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const lastMsg =
    message.trim() ||
    (attachments.length ? `${attachments.length} attachment(s)` : "");

  const track = await updateNewMessengerChatTrack({
    clientId,
    message: lastMsg,
    sentBy: "Company",
  });

  const pusher = getPusherInstance();
  await Promise.all([
    pusher.trigger(`messenger-${companyId}-${clientId}`, "messenger", saved),
    track &&
      pusher.trigger(`client-notify-${companyId}`, "client-notify", track),
    track &&
      pusher.trigger(
        `client-notify-${companyId}-${clientId}`,
        "client-notify",
        track,
      ),
  ]);

  return saved;
}

function buildMetaMessage(
  text: string,
  attachments: TAttachment[],
): Record<string, unknown> {
  if (text.trim()) return { text: text.trim() };
  if (attachments.length) {
    const att = attachments[0];
    const type = att.attachmentType === "image" ? "image" : "file";
    return {
      attachment: {
        type,
        payload: { url: att.url, is_reusable: false },
      },
    };
  }
  return { text: "" };
}
