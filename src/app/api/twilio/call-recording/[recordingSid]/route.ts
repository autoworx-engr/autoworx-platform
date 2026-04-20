import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * @swagger
 * /api/twilio/call-recording/{recordingSid}:
 *   get:
 *     summary: Get Twilio call recording by SID
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordingSid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *     responses:
 *       200:
 *         description: Audio file (mp3)
 *       400:
 *         description: Missing recording SID
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ recordingSid: string }> },
) {
  const params = await props.params;
  const { searchParams } = req.nextUrl;

  const recordingSid = params.recordingSid;
  let companyId = Number(searchParams.get("companyId"));

  if (!companyId) {
    companyId = await getCompanyId();
  }

  if (!recordingSid) {
    return new Response("Missing recording SID", { status: 400 });
  }

  const twilioCredentials = await db.twilioCredentials.findFirst({
    where: { companyId },
  });

  const accountSid = twilioCredentials?.accountSid!;
  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilioCredentials?.apiKeySid}:${twilioCredentials?.apiKeySecret}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    return new Response("Failed to fetch recording", {
      status: response.status,
    });
  }

  const audioBuffer = await response.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${recordingSid}.mp3"`,
    },
  });
}
