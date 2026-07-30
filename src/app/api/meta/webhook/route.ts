/* eslint-disable no-console */
import { updateNewMessengerChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const log = (tag: string, msg: string, data?: unknown) =>
  data !== undefined
    ? console.log(`[webhook/${tag}]`, msg, data)
    : console.log(`[webhook/${tag}]`, msg);

//  Webhook verification (GET)
export async function GET(req: NextRequest) {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  log("verify", `mode=${mode} token_match=${token === VERIFY_TOKEN}`);

  if (!VERIFY_TOKEN) {
    log("verify", "ERROR: META_WEBHOOK_VERIFY_TOKEN not set");
    return NextResponse.json(
      { error: "Server misconfigured: verify token not set" },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    log("verify", "OK — challenge accepted");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  log("verify", "FORBIDDEN — token mismatch or missing challenge");
  return new NextResponse("Forbidden", { status: 403 });
}

// ── Incoming message events (POST) ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    log("POST", "ERROR: could not parse JSON body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  log("POST", `object=${body.object} entries=${body.entry?.length ?? 0}`);

  if (body.object === "instagram") {
    for (const entry of body.entry ?? []) {
      const igUserId: string = entry.id;
      log(
        "instagram",
        `entry igUserId=${igUserId} events=${entry.messaging?.length ?? 0}`,
      );
      for (const event of entry.messaging ?? []) {
        await handleInstagramEvent(igUserId, event).catch((err) =>
          log(
            "instagram",
            `ERROR in handleInstagramEvent: ${err?.message}`,
            err,
          ),
        );
      }
    }
    return NextResponse.json({ status: "ok" });
  }

  if (body.object !== "page") {
    log("POST", `ignoring unknown object=${body.object}`);
    return NextResponse.json({ status: "ignored" });
  }

  for (const entry of body.entry ?? []) {
    const pageId: string = entry.id;
    log(
      "messenger",
      `entry pageId=${pageId} events=${entry.messaging?.length ?? 0}`,
    );
    for (const event of entry.messaging ?? []) {
      await handleMessagingEvent(pageId, event).catch((err) =>
        log("messenger", `ERROR in handleMessagingEvent: ${err?.message}`, err),
      );
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function handleMessagingEvent(pageId: string, event: any) {
  const mid: string | undefined = event.message?.mid;
  const text: string | undefined = event.message?.text;
  const attachments: any[] | undefined = event.message?.attachments;
  const psid: string = event.sender?.id;

  log(
    "messenger",
    `psid=${psid} mid=${mid} is_echo=${event.message?.is_echo} text="${text?.slice(0, 60)}"`,
  );

  if (!psid || !event.message) {
    log("messenger", "SKIP: missing psid or message");
    return;
  }
  if (event.message.is_echo) {
    log("messenger", "SKIP: is_echo (outgoing echo)");
    return;
  }

  const facebookPage = await db.facebookPage.findFirst({
    where: { pageId, isActive: true },
  });
  if (!facebookPage) {
    log("messenger", `SKIP: no active FacebookPage found for pageId=${pageId}`);
    return;
  }

  const { id: facebookPageId, companyId } = facebookPage;
  log(
    "messenger",
    `matched companyId=${companyId} facebookPageId=${facebookPageId}`,
  );

  if (mid) {
    const exists = await db.messengerMessage.findFirst({ where: { mid } });
    if (exists) {
      log("messenger", `SKIP: duplicate mid=${mid}`);
      return;
    }
  }

  const clientProfile = await db.facebookClientProfile.findUnique({
    where: { facebookPageId_psid: { facebookPageId, psid } },
    include: { client: true },
  });

  let clientId: number;

  if (clientProfile) {
    clientId = clientProfile.clientId;
    log("messenger", `existing client clientId=${clientId}`);
  } else {
    log("messenger", "new client — fetching Meta profile");
    const metaProfile = await fetchMetaProfile(
      psid,
      facebookPage.pageAccessToken,
    );
    const { firstName, lastName } = parseMetaName(metaProfile?.name);
    log("messenger", `Meta profile: name="${firstName} ${lastName ?? ""}"`);

    let source = await db.source.findFirst({
      where: { name: { equals: "facebook", mode: "insensitive" }, companyId },
    });
    if (!source) {
      source = await db.source.create({
        data: { name: "facebook", companyId },
      });
      log("messenger", "created 'facebook' source");
    }

    const company = await db.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true },
    });

    const newClient = await db.client.create({
      data: {
        firstName,
        lastName,
        companyId,
        photo: "/images/default.png",
        customerCompany: company.name,
        sourceId: source.id,
      },
    });
    await db.facebookClientProfile.create({
      data: { clientId: newClient.id, facebookPageId, psid },
    });
    clientId = newClient.id;
    log("messenger", `created new client clientId=${clientId}`);
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
  log("messenger", `saved message id=${saved.id}`);

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
    pusher.trigger(`message-${clientId}`, "client", {
      count: track?.messengerUnReadCount ?? 0,
    }),
  ]);
  log("messenger", "pusher events triggered — done");
}

async function fetchMetaProfile(psid: string, pageAccessToken: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${psid}?fields=name,profile_pic&access_token=${pageAccessToken}`,
    );
    if (!res.ok) return null;
    return res.json() as Promise<{
      name?: string;
      profile_pic?: string;
    } | null>;
  } catch {
    return null;
  }
}

function parseMetaName(
  fullName?: string,
  fallbackFirstName = "Messenger",
): { firstName: string; lastName: string | null } {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return { firstName: fallbackFirstName, lastName: "User" };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

// ── Instagram DM handler ──────────────────────────────────────────────────────
async function handleInstagramEvent(igUserId: string, event: any) {
  const mid: string | undefined = event.message?.mid;
  const text: string | undefined = event.message?.text;
  const igsid: string = event.sender?.id;

  log(
    "instagram",
    `igsid=${igsid} mid=${mid} is_echo=${event.message?.is_echo} text="${text?.slice(0, 60)}"`,
  );

  if (!igsid || !event.message) {
    log("instagram", "SKIP: missing igsid or message");
    return;
  }
  if (event.message.is_echo) {
    log("instagram", "SKIP: is_echo (outgoing echo)");
    return;
  }

  const igAccount = await db.instagramAccount.findFirst({
    where: { igUserId, isActive: true },
  });
  if (!igAccount) {
    log(
      "instagram",
      `SKIP: no active InstagramAccount for igUserId=${igUserId}`,
    );
    return;
  }

  const { id: igAccountId, companyId } = igAccount;
  log("instagram", `matched companyId=${companyId} igAccountId=${igAccountId}`);

  if (mid) {
    const exists = await db.instagramMessage.findFirst({ where: { mid } });
    if (exists) {
      log("instagram", `SKIP: duplicate mid=${mid}`);
      return;
    }
  }

  const clientProfile = await db.instagramClientProfile.findUnique({
    where: { igAccountId_igsid: { igAccountId, igsid } },
    include: { client: true },
  });

  let clientId: number;

  if (clientProfile) {
    clientId = clientProfile.clientId;
    log("instagram", `existing client clientId=${clientId}`);
  } else {
    log("instagram", "new client — fetching Instagram profile");
    const igProfile = await fetchMetaProfile(igsid, igAccount.pageAccessToken);
    const { firstName, lastName } = parseMetaName(igProfile?.name, "Instagram");
    log(
      "instagram",
      `IG profile: name="${firstName} ${lastName ?? ""}" pic=${!!igProfile?.profile_pic}`,
    );

    let source = await db.source.findFirst({
      where: { name: { equals: "instagram", mode: "insensitive" }, companyId },
    });
    if (!source) {
      source = await db.source.create({
        data: { name: "instagram", companyId },
      });
      log("instagram", "created 'instagram' source");
    }

    const newClient = await db.client.create({
      data: {
        firstName,
        lastName,
        companyId,
        photo: "/images/default.png",
        sourceId: source.id,
        isSalesAgent: true,
      },
    });
    await db.instagramClientProfile.create({
      data: { clientId: newClient.id, igAccountId, igsid },
    });
    clientId = newClient.id;
    log("instagram", `created new client clientId=${clientId}`);
  }

  const saved = await db.instagramMessage.create({
    data: {
      companyId,
      clientId,
      igAccountId,
      mid: mid ?? null,
      message: text ?? null,
      sentBy: "Client",
      isRead: false,
    },
    include: {
      attachments: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  log("instagram", `saved message id=${saved.id}`);

  const { updateNewInstagramChatTrack } =
    await import("@/actions/communication/client/chat-track");
  const track = await updateNewInstagramChatTrack({
    clientId,
    message: text ?? "",
    sentBy: "Client",
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
  log("instagram", "pusher events triggered — done");
}
