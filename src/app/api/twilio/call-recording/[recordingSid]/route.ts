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

  const range = req.headers.get("range");

  // Twilio honours Range, so pass it through and let it send just the slice the
  // player asked for instead of re-downloading the whole recording per seek.
  const response = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${twilioCredentials.apiKeySid}:${twilioCredentials.apiKeySecret}`,
      ).toString("base64")}`,
      ...(range ? { Range: range } : {}),
    },
  });

  if (!response.ok) {
    return new Response("Failed to fetch recording", {
      status: response.status,
    });
  }

  const body = Buffer.from(await response.arrayBuffer());

  // `?download=1` turns the same URL into a save-to-disk link for the player's
  // download action.
  const disposition =
    req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": `${disposition}; filename="${recordingSid}.mp3"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  // Twilio already answered with the requested slice — forward its range
  // metadata rather than slicing again.
  const upstreamRange = response.headers.get("content-range");
  if (response.status === 206 && upstreamRange) {
    return new Response(body, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(body.length),
        "Content-Range": upstreamRange,
      },
    });
  }

  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;

  if (match) {
    const [, startRaw, endRaw] = match;
    let start: number;
    let end: number;

    if (startRaw === "") {
      // Suffix range: the last N bytes
      const suffixLength = Number(endRaw);
      start = Math.max(0, body.length - suffixLength);
      end = body.length - 1;
    } else {
      start = Number(startRaw);
      end =
        endRaw === ""
          ? body.length - 1
          : Math.min(Number(endRaw), body.length - 1);
    }

    if (!Number.isFinite(start) || start > end || start >= body.length) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${body.length}` },
      });
    }

    const chunk = body.subarray(start, end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${body.length}`,
      },
    });
  }

  return new Response(body, {
    headers: { ...baseHeaders, "Content-Length": String(body.length) },
  });
}
