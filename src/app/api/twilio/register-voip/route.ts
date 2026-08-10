import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";

const NOTIFY_BINDING_PAGE_SIZE = 50;
const NOTIFY_BINDING_LIMIT = 500;
const DELETE_CONCURRENCY = 5;

async function deleteWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
) {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item).catch((err) =>
          console.warn("[register-voip] binding delete failed:", err),
        );
      }
    },
  );
  await Promise.all(workers);
}

export async function POST(request: NextRequest) {
  const principal = await getAuthPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    identity?: unknown;
    deviceToken?: unknown;
    platform?: unknown;
  };

  const identity =
    typeof body.identity === "string"
      ? body.identity.replace(/[^a-zA-Z0-9_\-.~]/g, "")
      : "";
  const deviceToken =
    typeof body.deviceToken === "string" ? body.deviceToken.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform : "ios";

  if (!identity || !deviceToken) {
    return NextResponse.json(
      { error: "identity and deviceToken are required" },
      { status: 400 },
    );
  }

  if (platform !== "ios") {
    return NextResponse.json(
      { error: "VoIP registration is only supported for iOS" },
      { status: 400 },
    );
  }

  const normalizedToken = deviceToken.toLowerCase();

  const twilioCredentials = await getTwilioCredentials({
    companyId: principal.companyId,
  });

  if (!twilioCredentials) {
    return NextResponse.json(
      { error: "Twilio credentials not found" },
      { status: 400 },
    );
  }

  const notifyServiceSid = process.env.TWILIO_VOIP_NOTIFY_SERVICE_SID;
  const credentialSid =
    twilioCredentials.apnPushCredentialSid ??
    process.env.TWILIO_VOIP_PUSH_CREDENTIAL_SID;

  if (!notifyServiceSid || !credentialSid) {
    return NextResponse.json(
      { error: "Twilio Notify or Push Credential SID missing" },
      { status: 500 },
    );
  }

  try {
    const client = Twilio(
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      { accountSid: twilioCredentials.accountSid },
    );

    const rawBindings = await client.notify.v1
      .services(notifyServiceSid)
      .bindings.list({
        identity: [identity],
        pageSize: NOTIFY_BINDING_PAGE_SIZE,
        limit: NOTIFY_BINDING_LIMIT,
      });

    const apnBindings = rawBindings
      .filter((b) => b.bindingType === "apn" && !!b.address)
      .map((b) => ({ sid: b.sid, address: b.address! }));

    const matching = apnBindings.filter(
      (b) => b.address.toLowerCase() === normalizedToken,
    );
    const stale = apnBindings.filter(
      (b) => b.address.toLowerCase() !== normalizedToken,
    );

    const toRemove = stale.concat(matching.slice(1));

    await deleteWithConcurrency(toRemove, DELETE_CONCURRENCY, (b) =>
      client.notify.v1.services(notifyServiceSid).bindings(b.sid).remove(),
    );

    if (matching.length > 0) {
      return NextResponse.json({ success: true, status: "already_registered" });
    }

    const binding = await client.notify.v1
      .services(notifyServiceSid)
      .bindings.create({
        identity,
        bindingType: "apn",
        address: normalizedToken,
        credentialSid,
        tag: ["voice"],
      });

    return NextResponse.json({
      success: true,
      status: "created",
      bindingSid: binding.sid,
    });
  } catch (error) {
    console.error("[register-voip] error:", error);
    return NextResponse.json(
      { error: "Failed to register VoIP device" },
      { status: 500 },
    );
  }
}
