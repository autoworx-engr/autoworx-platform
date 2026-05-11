import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";
import { logCallAndNotify } from "./_lib/logCallAndNotify";
import { buildIncomingTwiML } from "./_lib/buildIncomingTwiML";

/**
 * @swagger
 * /api/twilio/incoming:
 *   post:
 *     summary: Twilio incoming call webhook
 *     tags: [Twilio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               From:
 *                 type: string
 *               To:
 *                 type: string
 *               CallSid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incoming call processed
 *       400:
 *         description: Missing parameters
 */
export async function POST(request: Request) {
  console.log("📞 [Incoming] Webhook called at:", new Date().toISOString());
  try {
    const formData = await request.formData();

    // Log all form data for debugging
    const allData: Record<string, any> = {};
    formData.forEach((value, key) => {
      allData[key] = value;
    });
    console.log("📋 [Incoming] All FormData:", allData);

    const from = formData.get("From") as string; // Caller's phone number
    const to = formData.get("To") as string; // Your Twilio number
    const callSid = formData.get("CallSid") as string;

    console.log("📥 [Incoming] Received:", { from, to, callSid });

    if (!from || !to) {
      console.error("❌ [Incoming] Missing From or To");
      return NextResponse.json(
        { error: "Missing 'From' or 'To' parameters." },
        { status: 400 },
      );
    }

    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: { phoneNumber: { contains: to.replace("+", "") } },
    });

    const company = await db.company.findFirst({
      where: { id: twilioCredentials?.companyId },
      select: {
        id: true,
        name: true,
        callForwardingNumber: true,
        callWhisperEnabled: true,
      },
    });

    if (!twilioCredentials || !company) {
      return NextResponse.json(
        { error: "Twilio credentials or company not found" },
        { status: 400 },
      );
    }

    const entitlements = await getCompanyEntitlements(company.id);
    if (!entitlements.canUseVoice) {
      const voiceResponse = new twiml.VoiceResponse();
      voiceResponse.reject();
      return new Response(voiceResponse.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const companyId = company.id;
    console.log(
      "🚀 ~ POST ~ callForwardingNumber:",
      company.callForwardingNumber,
    );

    let client = await db.client.findFirst({
      where: {
        companyId,
        mobile: { contains: from.replace("+", "") },
      },
    });

    if (!client) {
      client = await db.client.create({
        data: {
          firstName: "Unknown",
          lastName: "Caller",
          mobile: from,
          companyId,
          isSalesAgent: true,
        },
      });
    }

    if (!client) {
      // Defensive: db.client.create should throw on failure, so this branch
      // should be unreachable. Surface a clear error if Prisma ever returns
      // a nullish row instead of letting downstream .id calls blow up.
      return NextResponse.json(
        { error: "Failed to resolve caller record" },
        { status: 500 },
      );
    }

    const callId = callSid || uuidv4();

    // Fire-and-forget: DB logging + push notifications don't affect TwiML response
    logCallAndNotify({
      callId,
      from,
      to,
      companyId,
      clientId: client.id,
      callerName:
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`.trim()
          : client.firstName || client.lastName || from,
    }).catch((err) =>
      console.error("❌ [Incoming] Async log/notify error:", err),
    );

    const twimlResponse = buildIncomingTwiML({
      callId,
      twilioPhoneNumber: twilioCredentials.phoneNumber,
      companyName: company.name,
      callWhisperEnabled: company.callWhisperEnabled ?? false,
      callForwardingNumber: company.callForwardingNumber,
      callRecordingEnabled: entitlements.callRecording,
      caller: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        fallbackName: from,
      },
    });

    return new Response(twimlResponse, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error handling incoming call:", error);
    return new Response("An error occurred while processing the request.", {
      status: 500,
    });
  }
}
