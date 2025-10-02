import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  const { identity } = await request.json();

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    let twilioCredentials = await getTwilioCredentials();

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
        incomingAllow: false, // Allows incoming calls
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
