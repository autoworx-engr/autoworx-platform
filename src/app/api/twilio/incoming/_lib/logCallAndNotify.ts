import { updateCallChatTrack } from "@/actions/communication/client/chat-track/callTrack";
import { db } from "@/lib/db";
import "server-only";

const USER_NOTIFY_CAP = 1000;

export async function logCallAndNotify({
  callId,
  from,
  to,
  companyId,
  clientId,
  callerName,
}: {
  callId: string;
  from: string;
  to: string;
  companyId: number;
  clientId: number;
  callerName: string;
}) {
  await db.clientCall.create({
    data: {
      callSid: callId,
      from,
      to,
      status: "ringing",
      direction: "inbound",
      sentBy: "Client",
      companyId,
      clientId,
    },
  });

  // Bump the client to the top of the communication hub the moment the phone
  // rings, the same way an inbound SMS does.
  await updateCallChatTrack({
    clientId,
    status: "ringing",
    direction: "inbound",
  });

  // Re-fetch one extra row so we can detect — and log — when the company has
  // more notify-eligible users than the cap covers.
  const companyUsers = await db.user.findMany({
    where: {
      companyId,
      employeeType: { in: ["Admin", "Manager", "Sales"] },
    },
    select: { id: true },
    take: USER_NOTIFY_CAP + 1,
  });

  if (companyUsers.length > USER_NOTIFY_CAP) {
    console.warn(
      `[twilio/incoming] Company ${companyId} has more than ${USER_NOTIFY_CAP} notify-eligible users; some users will not receive the incoming-call push.`,
    );
    companyUsers.length = USER_NOTIFY_CAP;
  }

  if (companyUsers.length === 0) return;

  // One OneSignal call covers every user via `include_aliases.external_id`
  // instead of fanning out N HTTP requests.
  await sendIncomingCallPush({
    userIds: companyUsers.map((u) => u.id),
    callerName,
    clientId,
    callId,
  });
}

async function sendIncomingCallPush({
  userIds,
  callerName,
  clientId,
  callId,
}: {
  userIds: number[];
  callerName: string;
  clientId: number;
  callId: string;
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_AUTHORIZATION_KEY;
  if (!appId || !apiKey) {
    console.warn(
      "[twilio/incoming] OneSignal env not configured; skipping push.",
    );
    return;
  }

  const deepLink = `/dashboard/communication/client/${clientId}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const res = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Key ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        contents: { en: `Call from ${callerName}` },
        headings: { en: "📞 Incoming Call" },
        target_channel: "push",

        include_aliases: {
          external_id: userIds.map((id) => `user-${id}`),
        },
        isAnyWeb: true,
        isIos: true,
        isAndroid: true,
        web_url: siteUrl ? `${siteUrl}${deepLink}` : undefined,
        data: { route: deepLink },
      }),
    });

    if (!res.ok) {
      console.warn(
        `[twilio/incoming] OneSignal push returned ${res.status}: ${await res.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.error("[twilio/incoming] OneSignal push failed:", err);
  }
}
