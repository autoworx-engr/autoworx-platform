import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import {
  assertCompanyAccess,
  requireBillingSession,
} from "@/lib/platform-billing/guards";
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
 *     responses:
 *       200:
 *         description: Access token generated
 *       400:
 *         description: Credentials not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const {
    identity: rawIdentity,
    companyId: rawCompanyId,
    platform,
  } = await request.json();
  const companyId = Number(rawCompanyId);

  if (rawIdentity == null || companyId == null || platform == null) {
    return NextResponse.json(
      { error: "Missing required fields: identity, companyId, platform" },
      { status: 400 },
    );
  }
  // Twilio Client identity cannot contain '+' or other special chars — normalize.
  const identity = (rawIdentity as string).replace(/[^a-zA-Z0-9_\-.~]/g, "");

  const entitlements = await getCompanyEntitlements(companyId);
  if (!entitlements.canUseVoice) {
    return NextResponse.json(
      { error: "Voice calling is not enabled for this plan." },
      { status: 403 },
    );
  }

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    let twilioCredentials = await getTwilioCredentials({
      companyId,
    });

    if (!twilioCredentials) {
      console.error("🚀 ~ POST ~ twilioCredentials not found");
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 },
      );
    }

    const token = new AccessToken(
      twilioCredentials.accountSid,
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      { identity },
    );

    let pushCredentialSid: string | undefined;
    console.log(
      "🚀 ~ POST ~ twilioCredentials APN_FCM_TEST:",
      twilioCredentials,
    );

    if (platform === "ios") {
      pushCredentialSid = twilioCredentials.apnPushCredentialSid ?? undefined;
      console.log("🚀 ~ POST ~ ios pushCredentialSid:", pushCredentialSid);
    } else if (platform === "android") {
      pushCredentialSid = twilioCredentials.fcmPushCredentialSid ?? undefined;
      console.log("🚀 ~ POST ~ android pushCredentialSid:", pushCredentialSid);
    }

    if (twilioCredentials.twimlAppSid) {
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twilioCredentials.twimlAppSid,
        incomingAllow: true,
        pushCredentialSid,
      });

      token.addGrant(voiceGrant);

      return NextResponse.json({ token: token.toJwt() });
    } else {
      throw new Error("Twiml app sid not found");
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
