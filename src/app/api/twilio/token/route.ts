import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  const { identity, companyId, platform } = await request.json();

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    let twilioCredentials = await getTwilioCredentials({ companyId });

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

    let pushCredentialSid;

    if (platform === "ios") {
      pushCredentialSid = process.env.TWILIO_PUSH_CREDENTIAL_SID_APN;
    } else if (platform === "android") {
      pushCredentialSid = process.env.TWILIO_PUSH_CREDENTIAL_SID_FCM;
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
