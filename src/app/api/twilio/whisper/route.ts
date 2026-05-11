import { db } from "@/lib/db";
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
 *     responses:
 *       200:
 *         description: TwiML whisper response returned
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyIdParam = searchParams.get("companyId");

  const voiceResponse = new twiml.VoiceResponse();

  // Look up the company to get its name and whether whisper is enabled
  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : NaN;
  if (Number.isFinite(companyId)) {
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
    // If disabled, return an empty TwiML response so the call bridges immediately
  }

  return new Response(voiceResponse.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
