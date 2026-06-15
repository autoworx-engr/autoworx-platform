import { db } from "@/lib/db";
import {
  formDataToParams,
  // verifyTwilioSignature, // TEMP: signature verification disabled for debugging
} from "@/lib/twilio/verifyTwilioSignature";
import { twiml } from "twilio";

/**
 * @swagger
 * /api/twilio/whisper:
 *   post:
 *     summary: Twilio call whisper – notifies the called party that the call is being recorded
 *     tags: [Twilio]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 */
export async function POST(request: Request) {
  const voiceResponse = new twiml.VoiceResponse();

  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : NaN;

    if (Number.isFinite(companyId)) {
      const twilioCredentials = await db.twilioCredentials.findFirst({
        where: { companyId },
        select: { authToken: true },
      });

      // The whisper webhook receives form-encoded params; consume them so the
      // signature validator (which signs URL + sorted params) can match.
      let params: Record<string, string> = {};
      try {
        const formData = await request.formData();
        params = formDataToParams(formData);
      } catch {
        // Some Twilio whisper hits have no body — that's fine for verification
        // since the signature is computed over an empty param map.
      }

      // TEMP: signature verification disabled for debugging
      // const verification = await verifyTwilioSignature(
      //   request,
      //   params,
      //   twilioCredentials?.authToken ?? null,
      // );
      // if (!verification.ok) {
      //   // Return an empty (200) TwiML so the call still bridges even if the
      //   // signature can't be verified — bridging trumps the whisper message.
      //   return new Response(voiceResponse.toString(), {
      //     headers: { "Content-Type": "text/xml" },
      //   });
      // }

      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { name: true, callWhisperEnabled: true },
      });

      if (company?.callWhisperEnabled) {
        const companyName = company.name ?? "this company";
        voiceResponse.say(
          { voice: "Polly.Joanna", language: "en-US" },
          `This is a call from ${companyName}. This call may be recorded for quality and training purposes.`,
        );
      }
    }
  } catch (error) {
    console.error("[twilio/whisper] error:", error);
    // Return an empty TwiML so the dial still bridges.
  }

  return new Response(voiceResponse.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
