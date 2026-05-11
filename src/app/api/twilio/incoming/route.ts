import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";

type DialAttributes = Parameters<twiml.VoiceResponse["dial"]>[0];

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

    // Find the Twilio credentials for this phone number
    const twilioCredentials = await db.twilioCredentials.findFirst({
      where: {
        phoneNumber: {
          contains: to.replace("+", ""),
        },
      },
    });

    const company = await db.company.findFirst({
      where: {
        id: twilioCredentials?.companyId,
      },
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

    const companyId = company?.id;
    const callForwardingNumber = company?.callForwardingNumber;
    console.log("🚀 ~ POST ~ callForwardingNumber:", callForwardingNumber);

    // Try to find the client
    let client = await db.client.findFirst({
      where: {
        companyId: companyId,
        mobile: {
          contains: from.replace("+", ""),
        },
      },
    });

    // If client doesn't exist, create a new one
    if (!client) {
      client = await db.client.create({
        data: {
          firstName: "Unknown",
          lastName: "Caller",
          mobile: from,
          companyId: companyId,
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

    // Generate TwiML to dial the user's browser/device
    const voiceResponse = new twiml.VoiceResponse();
    console.log("🚀 ~ POST ~ voiceResponse:", voiceResponse);

    const recordingOptions: Partial<DialAttributes> = entitlements.callRecording
      ? {
          record: "record-from-answer" as const,
          recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
          recordingStatusCallbackMethod: "POST",
        }
      : {};
    // Inform the caller that the call may be recorded (only if whisper is enabled)
    if (company.callWhisperEnabled) {
      const companyName = company.name ?? "this company";
      voiceResponse.say(
        { voice: "Polly.Joanna", language: "en-US" },
        `Thanks for calling ${companyName}. This call may be recorded for quality and training purposes.`,
      );
    }

    // Check if call forwarding is enabled
    if (callForwardingNumber) {
      console.log(`📞 [Incoming] Forwarding call to: ${callForwardingNumber}`);

      // Forward the call to the specified number
      voiceResponse.dial(
        {
          timeout: 30,
          answerOnBridge: true,
          action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
          ...recordingOptions,
        },
        callForwardingNumber,
      );
    } else {
      // Dial to the client identity (the browser device) - original behavior
      const dial = voiceResponse.dial({
        timeout: 60, // Give 60 seconds for the call to be answered
        answerOnBridge: true, // Only answer when the call is bridged (connected)
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        ...recordingOptions,
      });

      // Connect to the user's device
      // IMPORTANT: The identity here must match what was used when creating the token.
      // Twilio Client identity cannot contain '+' or other special chars — normalize it.
      const clientIdentity = twilioCredentials.phoneNumber.replace(
        /[^a-zA-Z0-9_\-.~]/g,
        "",
      );
      console.log(
        `📞 [Incoming] Dialing client identity: "${clientIdentity}" (raw: "${twilioCredentials.phoneNumber}")`,
      );

      // Pass client information as parameters
      const callerName =
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`.trim()
          : client.firstName || client.lastName || "Unknown Caller";

      const clientDial = dial.client(clientIdentity);
      clientDial.parameter({
        name: "ClientName",
        value: callerName,
      });
      clientDial.parameter({
        name: "ClientId",
        value: client.id.toString(),
      });
      clientDial.parameter({
        name: "ParentCallSid",
        value: callId, // Pass the parent call SID to the browser
      });
    }

    const twimlResponse = voiceResponse.toString();

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

async function logCallAndNotify({
  callId,
  from,
  to,
  companyId,
  clientId,
  callerName,
}: {
  callId: string;
  from: string;
  to: string;
  companyId: number;
  clientId: number;
  callerName: string;
}) {
  await db.clientCall.create({
    data: {
      callSid: callId,
      from,
      to,
      status: "ringing",
      direction: "inbound",
      sentBy: "Client",
      companyId,
      clientId,
    },
  });

  const companyUsers = await db.user.findMany({
    where: {
      companyId,
      employeeType: { in: ["Admin", "Manager", "Sales"] },
    },
    select: { id: true },
    take: 1000,
  });

  await Promise.allSettled(
    companyUsers.map((user) =>
      sendPushNotification({
        userId: user.id,
        title: "📞 Incoming Call",
        body: `Call from ${callerName}`,
        deepLink: `/dashboard/communication/client/${clientId}`,
      }).catch((err) =>
        console.error(
          `Failed to send push notification to user ${user.id}:`,
          err,
        ),
      ),
    ),
  );
}
