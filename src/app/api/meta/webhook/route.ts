import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { sendClientMessageNotification } from "@/lib/notification/communication-notify";
import sendClientMailOrSMSNotify from "@/lib/pusher/client-conversation-notify";
import { getPusherInstance } from "@/lib/pusher/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v21.0";
const pusher = getPusherInstance();

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verifies the `x-hub-signature-256` HMAC header Meta sends with every POST.
 * Uses `timingSafeEqual` to prevent timing-based attacks.
 *
 * When `META_APP_SECRET` is absent and `NODE_ENV` is not "production", the
 * check is skipped so local development works without the secret set.
 *
 * @param rawBody - Raw request body string (must not be parsed yet)
 * @param signature - Value of the `x-hub-signature-256` request header
 */
function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!process.env.META_APP_SECRET) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[meta/webhook] META_APP_SECRET not set — blocking in production",
      );
      return false;
    }
    return true; // allow in development without the secret
  }
  if (!signature) return false;
  const expected = `sha256=${createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Webhook verification (GET) ───────────────────────────────────────────────

/**
 * @swagger
 * /api/meta/webhook:
 *   get:
 *     summary: Meta webhook verification handshake
 *     description: Meta calls this once when a webhook URL is registered in the developer dashboard. Echoes back `hub.challenge` if the verify token matches `META_WEBHOOK_VERIFY_TOKEN`.
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         schema: { type: string }
 *       - in: query
 *         name: hub.verify_token
 *         schema: { type: string }
 *       - in: query
 *         name: hub.challenge
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Challenge string echoed back
 *       403:
 *         description: Verify token mismatch
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── Incoming message handler (POST) ─────────────────────────────────────────

/**
 * @swagger
 * /api/meta/webhook:
 *   post:
 *     summary: Receive Instagram DM and Facebook Messenger messages
 *     description: |
 *       Meta POSTs all messaging events here. The handler:
 *       1. Verifies the X-Hub-Signature-256 HMAC signature
 *       2. Routes by `body.object` ("instagram" | "page") to determine platform
 *       3. Looks up the company via the pageId in MetaCredentials
 *       4. Matches or auto-creates a Client by `metaSenderId`
 *       5. Persists the message and attachments
 *       6. Triggers Pusher events for real-time delivery
 *       7. Sends push/email notifications
 *       Always returns 200 — Meta retries on non-2xx, which causes duplicate messages.
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: Always returned to prevent Meta retries
 *       403:
 *         description: Invalid HMAC signature
 */
export async function POST(req: NextRequest) {
  // Read the raw body before any parsing so the HMAC is computed over the
  // original bytes, exactly as Meta signed them.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody) as MetaWebhookPayload;

    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Meta sends "instagram" for Instagram DMs, "page" for Facebook Messenger
    const platform: "INSTAGRAM" | "FACEBOOK" =
      body.object === "instagram" ? "INSTAGRAM" : "FACEBOOK";

    for (const entry of body.entry) {
      const pageId = entry.id;

      const metaCredentials = await db.metaCredentials.findFirst({
        where: { pageId, isActive: true },
      });
      if (!metaCredentials) continue;

      const companyId = metaCredentials.companyId;
      const decryptedToken = decrypt(metaCredentials.pageAccessToken);

      for (const event of entry.messaging ?? []) {
        // Skip delivery/read receipts and page-sent echoes
        if (!event.message || event.message.is_echo) continue;

        const senderId = event.sender.id;
        const messageText = event.message.text;
        const metaMessageId = event.message.mid;
        const rawAttachments = event.message.attachments;

        // Match client by their Meta PSID (page-scoped user ID).
        // If no match, fetch their Meta profile and auto-create a Client record.
        let client = await db.client.findFirst({
          where: { metaSenderId: senderId, companyId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyId: true,
            metaSenderId: true,
            Lead: true,
          },
        });

        if (!client) {
          let firstName = senderId;
          let lastName = " ";
          try {
            const profileRes = await fetch(
              `${GRAPH}/${senderId}?fields=name&access_token=${decryptedToken}`,
            );
            const profileData = (await profileRes.json()) as { name?: string };
            if (profileData.name) {
              const parts = profileData.name.trim().split(" ");
              firstName = parts[0] ?? senderId;
              lastName = parts.slice(1).join(" ") || " ";
            }
          } catch {
            // Fall back to senderId as display name if profile fetch fails
          }

          client = await db.client.create({
            data: {
              firstName,
              lastName,
              companyId,
              metaSenderId: senderId,
              isSalesAgent: true,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyId: true,
              metaSenderId: true,
              Lead: true,
            },
          });
        } else if (!client.metaSenderId) {
          await db.client.update({
            where: { id: client.id },
            data: { metaSenderId: senderId },
          });
        }

        if (!client) continue;

        const dbMessage = await db.clientMetaMessage.create({
          data: {
            message: messageText ?? "",
            platform,
            metaMessageId,
            metaSenderId: senderId,
            sentBy: "Client",
            isRead: false,
            companyId,
            clientId: client.id,
          },
        });

        const savedAttachments: {
          id: number;
          url: string;
          name: string | null;
          type: string | null;
          createdAt: Date;
          clientMetaMessageId: number;
        }[] = [];

        if (rawAttachments?.length) {
          for (const att of rawAttachments) {
            const saved = await db.clientMetaAttachments.create({
              data: {
                clientMetaMessageId: dbMessage.id,
                url: att.payload.url,
                type: att.type,
                name: `${dbMessage.id}_${Date.now()}.${att.type}`,
              },
            });
            savedAttachments.push(saved);
          }
        }

        const lastMessage =
          messageText || (savedAttachments.length > 0 ? "[Attachment]" : "");

        const track = await updateMetaChatTrack({
          clientId: client.id,
          metaLastMessage: lastMessage,
          metaLastPlatform: platform,
          lastMessageBy: "Client",
        });

        // Primary Pusher channel — mirrors sms-{companyId}-{clientId} / "sms" pattern
        await pusher.trigger(`meta-${companyId}-${client.id}`, "meta", {
          ...dbMessage,
          attachments: savedAttachments,
        });

        if (track) {
          sendClientMailOrSMSNotify(companyId, track);
        }

        const totalUnread = await db.clientConversationTrack.findFirst({
          where: { clientId: client.id },
          select: { metaUnReadCount: true },
        });

        // Fallback channel mirrors message-{clientId} / "client" pattern
        pusher.trigger(`message-${client.id}`, "client", {
          count: totalUnread?.metaUnReadCount,
        });

        sendClientMessageNotification({
          companyId,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
        });
      }
    }

    revalidatePath("/dashboard/communication/client");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: unknown) {
    console.error("[meta/webhook] Unhandled error:", error);
    // Always 200 — returning a non-2xx causes Meta to retry, producing duplicates
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

// ─── Conversation track helper ────────────────────────────────────────────────

/**
 * Creates or updates the `ClientConversationTrack` row for an incoming Meta
 * message. Increments `metaUnReadCount` and sets `metaIsRead = false`.
 * Mirrors `updateNewSMSChatTrack` in the Twilio integration.
 */
async function updateMetaChatTrack({
  clientId,
  metaLastMessage,
  metaLastPlatform,
  lastMessageBy,
}: {
  clientId: number;
  metaLastMessage: string;
  metaLastPlatform: string;
  lastMessageBy: string;
}) {
  const existing = await db.clientConversationTrack.findUnique({
    where: { clientId },
  });

  if (!existing) {
    return db.clientConversationTrack.create({
      data: {
        clientId,
        emailLastMessage: "",
        smsLastMessage: "",
        metaLastMessage,
        metaIsRead: false,
        metaUnReadCount: 1,
        metaLastPlatform,
        lastMessageBy,
        sendAt: new Date(),
      },
    });
  }

  return db.clientConversationTrack.update({
    where: { clientId },
    data: {
      metaLastMessage,
      metaIsRead: false,
      metaUnReadCount: { increment: 1 },
      metaLastPlatform,
      lastMessageBy,
      sendAt: new Date(),
    },
  });
}

// ─── Payload types ────────────────────────────────────────────────────────────

type MetaAttachment = {
  type: string;
  payload: { url: string };
};

type MetaMessage = {
  mid: string;
  text?: string;
  is_echo?: boolean;
  attachments?: MetaAttachment[];
};

type MetaMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MetaMessage;
};

type MetaEntry = {
  id: string;
  time: number;
  messaging: MetaMessagingEvent[];
};

type MetaWebhookPayload = {
  object: string;
  entry: MetaEntry[];
};
