import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * @swagger
 * /api/twilio/call-recording/{recordingSid}:
 *   get:
 *     summary: Get Twilio call recording by SID for the authenticated company
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordingSid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audio file (mp3)
 *       400:
 *         description: Missing recording SID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recording not found or not accessible
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ recordingSid: string }> },
) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { recordingSid } = await props.params;
  if (!recordingSid) {
    return new Response("Missing recording SID", { status: 400 });
  }

  // Confirm the recordingSid belongs to a call owned by the caller's company
  // before we go fetch and stream it from Twilio.
  const ownedCall = await db.clientCall.findFirst({
    where: {
      companyId: principal.companyId,
      recordingUrl: { contains: recordingSid },
    },
    select: { id: true },
  });
  if (!ownedCall) {
    return new Response("Recording not found", { status: 404 });
  }

  const twilioCredentials = await db.twilioCredentials.findFirst({
    where: { companyId: principal.companyId },
    select: { accountSid: true, apiKeySid: true, apiKeySecret: true },
  });

  if (
    !twilioCredentials?.accountSid ||
    !twilioCredentials.apiKeySid ||
    !twilioCredentials.apiKeySecret
  ) {
    return new Response("Twilio credentials not configured", { status: 404 });
  }

  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioCredentials.accountSid}/Recordings/${recordingSid}.mp3`;

  const authorization = `Basic ${Buffer.from(
    `${twilioCredentials.apiKeySid}:${twilioCredentials.apiKeySecret}`,
  ).toString("base64")}`;

  // Players ask for byte ranges to seek and to work out the duration. Twilio
  // honours Range, so pass it straight through; a proxy that always answered
  // 200 with the whole file left the media unseekable, which is what made the
  // progress bar jump around instead of advancing.
  const range = req.headers.get("range");

  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: authorization,
      ...(range ? { Range: range } : {}),
    },
  });

  if (!response.ok) {
    return new Response("Failed to fetch recording", {
      status: response.status,
    });
  }

  // `?download=1` turns the same URL into a save-to-disk link for the player's
  // download action.
  const disposition =
    req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

  const audioBuffer = await response.arrayBuffer();

  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Content-Disposition": `${disposition}; filename="${recordingSid}.mp3"`,
    "Content-Length": String(audioBuffer.byteLength),
    // Recordings never change once Twilio has written them.
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  });

  // 206 from Twilio means the range was served; forward the range metadata so
  // the player can map bytes back to time.
  const contentRange = response.headers.get("content-range");
  if (response.status === 206 && contentRange) {
    headers.set("Content-Range", contentRange);
    return new Response(audioBuffer, { status: 206, headers });
  }

  // Twilio ignored the range (or there wasn't one) — satisfy it here so the
  // client still gets the 206 it asked for.
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    const total = audioBuffer.byteLength;
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      if (start <= end && start < total) {
        const slice = audioBuffer.slice(start, end + 1);
        headers.set("Content-Length", String(slice.byteLength));
        headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
        return new Response(slice, { status: 206, headers });
      }
    }
  }

  return new Response(audioBuffer, { headers });
}
