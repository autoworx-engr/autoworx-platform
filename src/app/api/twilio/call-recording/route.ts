import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/twilio/call-recording:
 *   post:
 *     summary: Twilio call recording webhook
 *     tags: [Twilio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               CallStatus:
 *                 type: string
 *               CallDuration:
 *                 type: integer
 *               RecordingUrl:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording received
 *       400:
 *         description: Missing callId
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    const formData = await request.formData();
    const callStatus = formData.get("CallStatus") as string;
    const duration = formData.get("CallDuration") as string | null;
    const recordingUrl = formData.get("RecordingUrl") as string | null;

    if (!callId) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Update ClientCall record with status and optional recording
    try {
      await db.clientCall.update({
        where: { callSid: callId },
        data: {
          status: callStatus,
          duration: duration ? parseInt(duration) : undefined,
          recordingUrl: recordingUrl || undefined,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        // Return 404 so Twilio stops retrying for a callSid we never tracked.
        return new Response("Call not found", { status: 404 });
      }
      throw err;
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error in Twilio call-recording webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
