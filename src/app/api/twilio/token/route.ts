import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
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
  const { identity, companyId } = await request.json();

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    let twilioCredentials = await getTwilioCredentials(companyId);

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 }
      );
    }

    const token = new AccessToken(
      twilioCredentials.accountSid,
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      { identity }
    );

    if (twilioCredentials.twimlAppSid) {
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twilioCredentials.twimlAppSid,
        incomingAllow: true, // Allows incoming calls
        pushCredentialSid: process.env.TWILIO_PUSH_CREDENTIAL_SID,
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
