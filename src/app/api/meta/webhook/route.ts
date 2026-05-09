import { updateNewMessengerChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

// ── Webhook verification (GET) ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Read env at request time so hot-reload / missing vars surface immediately
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[meta/webhook] verify attempt", {
    mode,
    token,
    challenge,
    VERIFY_TOKEN,
  });

  if (!VERIFY_TOKEN) {
    console.error("[meta/webhook] META_WEBHOOK_VERIFY_TOKEN is not set in env");
    return NextResponse.json(
      { error: "Server misconfigured: verify token not set" },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[meta/webhook] token mismatch or bad mode", {
    mode,
    token,
    expected: VERIFY_TOKEN,
  });
  return new NextResponse("Forbidden", { status: 403 });
}

// ── Incoming message events (POST) ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (body.object !== "page") {
    return NextResponse.json({ status: "ignored" });
  }

  for (const entry of body.entry ?? []) {
    const pageId: string = entry.id;
    for (const event of entry.messaging ?? []) {
      await handleMessagingEvent(pageId, event).catch(console.error);
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function handleMessagingEvent(pageId: string, event: any) {
  const mid: string | undefined = event.message?.mid;
  const text: string | undefined = event.message?.text;
  const attachments: any[] | undefined = event.message?.attachments;
  const psid: string = event.sender?.id;

  if (!psid || !event.message) return;
  if (event.message.is_echo) return; // skip echoes of our own sends

  // Look up the FacebookPage by pageId
  const facebookPage = await db.facebookPage.findFirst({
    where: { pageId, isActive: true },
  });
  if (!facebookPage) return;

  const { id: facebookPageId, companyId } = facebookPage;

  // Dedup: skip already-processed mids
  if (mid) {
    const exists = await db.messengerMessage.findFirst({ where: { mid } });
    if (exists) return;
  }

  // Resolve or create client from PSID
  const clientProfile = await db.facebookClientProfile.findUnique({
    where: { facebookPageId_psid: { facebookPageId, psid } },
    include: { client: true },
  });

  let clientId: number;

  if (clientProfile) {
    clientId = clientProfile.clientId;
  } else {
    // Auto-create a client placeholder from the Messenger profile
    const metaProfile = await fetchMetaProfile(
      psid,
      facebookPage.pageAccessToken,
    );
    const newClient = await db.client.create({
      data: {
        firstName: metaProfile?.first_name ?? "Messenger",
        lastName: metaProfile?.last_name ?? "User",
        companyId,
        photo: metaProfile?.profile_pic ?? "/images/default.png",
      },
    });
    await db.facebookClientProfile.create({
      data: { clientId: newClient.id, facebookPageId, psid },
    });
    clientId = newClient.id;
  }

  const messageText = text ?? null;
  const metaAttachments: {
    url: string;
    name: string;
    attachmentType: string;
  }[] = (attachments ?? []).map((a: any) => ({
    url: a.payload?.url ?? "",
    name: a.title ?? null,
    attachmentType: a.type ?? "file",
  }));

  const saved = await db.messengerMessage.create({
    data: {
      companyId,
      clientId,
      facebookPageId,
      mid: mid ?? null,
      message: messageText,
      sentBy: "Client",
      isRead: false,
      attachments: metaAttachments.length
        ? { create: metaAttachments }
        : undefined,
    },
    include: {
      attachments: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const lastMsg =
    messageText ??
    (metaAttachments.length ? `${metaAttachments.length} attachment(s)` : "");

  const track = await updateNewMessengerChatTrack({
    clientId,
    message: lastMsg,
    sentBy: "Client",
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
}

async function fetchMetaProfile(psid: string, pageAccessToken: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`,
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
