import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const {
      identity,
      deviceToken,
      companyId,
      platform = "ios",
    } = await request.json();

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

    const normalizedToken = deviceToken.trim().toLowerCase();

    const twilioCredentials = await getTwilioCredentials({ companyId });

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

    const notifyServiceSid = process.env.TWILIO_VOIP_NOTIFY_SERVICE_SID;

    const credentialSid =
      (twilioCredentials as any).apnPushCredentialSid ??
      process.env.TWILIO_VOIP_PUSH_CREDENTIAL_SID;

    if (!notifyServiceSid || !credentialSid) {
      return NextResponse.json(
        { error: "Twilio Notify or Push Credential SID missing" },
        { status: 500 },
      );
    }

    const client = Twilio(
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      { accountSid: twilioCredentials.accountSid },
    );

    // Fetch ALL bindings for identity (safe pagination)
    const bindings = await client.notify.v1
      .services(notifyServiceSid)
      .bindings.list({ identity });

    const apnBindings = bindings.filter(
      (b) => b.bindingType === "apn" && !!b.address,
    );

    const matching = apnBindings.filter(
      (b) => b.address?.toLowerCase() === normalizedToken,
    );

    // Remove stale bindings (enforce single-device policy)
    const staleBindings = apnBindings.filter(
      (b) => b.address?.toLowerCase() !== normalizedToken,
    );

    await Promise.all(
      staleBindings.map((b) =>
        client.notify.v1.services(notifyServiceSid).bindings(b.sid).remove(),
      ),
    );

    if (matching.length > 0) {
      // Remove duplicates beyond the first
      const [, ...duplicates] = matching;

      await Promise.all(
        duplicates.map((b) =>
          client.notify.v1.services(notifyServiceSid).bindings(b.sid).remove(),
        ),
      );

      return NextResponse.json({
        success: true,
        status: "already_registered",
      });
    }

    // Create binding
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
  } catch (error: any) {
    console.error("VoIP registration error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
