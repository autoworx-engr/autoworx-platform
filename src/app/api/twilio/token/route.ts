import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/**
 * @swagger
 * /api/twilio/token:
 *   post:
 *     summary: Get Twilio access token
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identity:
 *                 type: string
 *               platform:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token generated
 *       400:
 *         description: Voice not provisioned for this company
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Voice calling not enabled for this plan
 */
export async function POST(request: NextRequest) {
  const principal = await getAuthPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    identity?: unknown;
    platform?: unknown;
  };

  const rawIdentity = typeof body.identity === "string" ? body.identity : "";
  if (rawIdentity.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: identity" },
      { status: 400 },
    );
  }

  const platform =
    body.platform === "ios" || body.platform === "android"
      ? body.platform
      : undefined;

  // Twilio Client identity cannot contain '+' or other special chars — normalize.
  const identity = rawIdentity.replace(/[^a-zA-Z0-9_\-.~]/g, "");

  const entitlements = await getCompanyEntitlements(principal.companyId);
  if (!entitlements.canUseVoice) {
    return NextResponse.json(
      { error: "Voice calling is not enabled for this plan." },
      { status: 403 },
    );
  }

  const twilioCredentials = await getTwilioCredentials({
    companyId: principal.companyId,
  });

  if (!twilioCredentials) {
    return NextResponse.json(
      { error: "Twilio credentials not found" },
      { status: 400 },
    );
  }

  if (!twilioCredentials.twimlAppSid) {
    return NextResponse.json(
      { error: "Voice not provisioned for this company" },
      { status: 400 },
    );
  }

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      twilioCredentials.accountSid,
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      { identity },
    );

    const pushCredentialSid =
      platform === "ios"
        ? (twilioCredentials.apnPushCredentialSid ?? undefined)
        : platform === "android"
          ? (twilioCredentials.fcmPushCredentialSid ?? undefined)
          : undefined;

    token.addGrant(
      new VoiceGrant({
        outgoingApplicationSid: twilioCredentials.twimlAppSid,
        incomingAllow: true,
        pushCredentialSid,
      }),
    );

    return NextResponse.json({ token: token.toJwt() });
  } catch (error) {
    console.error("[twilio/token] Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
