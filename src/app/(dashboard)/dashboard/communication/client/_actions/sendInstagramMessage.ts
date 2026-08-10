"use server";

import { updateNewInstagramChatTrack } from "@/actions/communication/client/chat-track";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { getPusherInstance } from "@/lib/pusher/server";

type TArgs = {
  clientId: number;
  message?: string;
  attachments?: { url: string; name: string; attachmentType: string }[];
};

export async function sendInstagramMessage({
  clientId,
  message = "",
  attachments = [],
}: TArgs) {
  const companyId = await getCompanyId();
  const user = await getUser();

  const profile = await db.instagramClientProfile.findFirst({
    where: { clientId },
    include: { igAccount: true },
  });

  if (!profile) throw new Error("No Instagram profile linked to this client.");
  if (!profile.igAccount.isActive)
    throw new Error("Instagram account is disconnected.");

  const { igsid, igAccount } = profile;
  const { pageAccessToken, igUserId, id: igAccountId } = igAccount;

  const metaPayload: Record<string, unknown> = {
    recipient: { id: igsid },
    message: message.trim() ? { text: message.trim() } : undefined,
  };

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...metaPayload, access_token: pageAccessToken }),
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
    throw new Error(metaError?.message ?? "Failed to send via Instagram.");
  }

  const metaData = (await metaRes.json()) as { message_id?: string };

  const saved = await db.instagramMessage.create({
    data: {
      companyId,
      clientId,
      igAccountId,
      mid: metaData.message_id ?? null,
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
  const track = await updateNewInstagramChatTrack({
    clientId,
    message: lastMsg,
    sentBy: "Company",
  });

  const pusher = getPusherInstance();
  await Promise.all([
    pusher.trigger(`instagram-${companyId}-${clientId}`, "instagram", saved),
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
