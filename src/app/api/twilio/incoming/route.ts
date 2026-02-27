import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";

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
        { status: 400 }
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
        callForwardingNumber: true,
      },
    });

    if (!twilioCredentials || !company) {
      return NextResponse.json(
        { error: "Twilio credentials or company not found" },
        { status: 400 }
      );
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
        },
      });
    }

    const callId = callSid || uuidv4();

    console.log("📝 [Incoming] Creating ClientCall record with:", {
      callSid: callId,
      from,
      to,
      companyId: twilioCredentials.companyId,
      clientId: client.id,
    });

    // Create ClientCall record for incoming call
    const createdCall = await db.clientCall.create({
      data: {
        callSid: callId,
        from,
        to,
        status: "ringing",
        direction: "inbound",
        sentBy: "Client",
        companyId: companyId,
        clientId: client.id,
      },
    });

    console.log("✅ [Incoming] ClientCall created successfully:", {
      id: createdCall.id,
      callSid: createdCall.callSid,
      status: createdCall.status,
    });

    // Send push notifications to admin, manager, and sales users only
    try {
      const companyUsers = await db.user.findMany({
        where: {
          companyId: companyId,
          employeeType: {
            in: ["Admin", "Manager", "Sales"],
          },
        },
        select: {
          id: true,
        },
      });

      const callerName =
        client.firstName && client.lastName
          ? `${client.firstName} ${client.lastName}`.trim()
          : client.firstName || client.lastName || from;

      // Send push notification to each user
      const notificationPromises = companyUsers.map((user) =>
        sendPushNotification({
          userId: user.id,
          title: "📞 Incoming Call",
          body: `Call from ${callerName}`,
          deepLink: `/dashboard/communication/client/${client.id}`,
        }).catch((error) => {
          console.error(
            `Failed to send push notification to user ${user.id}:`,
            error
          );
        })
      );

      await Promise.allSettled(notificationPromises);
      console.log(
        `📱 Push notifications sent to ${companyUsers.length} user(s)`
      );
    } catch (notificationError) {
      console.error("Error sending push notifications:", notificationError);
      // Continue even if notifications fail
    }

    // Generate TwiML to dial the user's browser/device
    const voiceResponse = new twiml.VoiceResponse();
    console.log("🚀 ~ POST ~ voiceResponse:", voiceResponse);

    // Check if call forwarding is enabled
    if (callForwardingNumber) {
      console.log(`📞 [Incoming] Forwarding call to: ${callForwardingNumber}`);

      // Forward the call to the specified number
      voiceResponse.dial(
        {
          record: "record-from-answer",
          recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
          recordingStatusCallbackMethod: "POST",
          timeout: 30,
          answerOnBridge: true,
          action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        },
        callForwardingNumber
      );
    } else {
      // Dial to the client identity (the browser device) - original behavior
      const dial = voiceResponse.dial({
        record: "record-from-answer",
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
        recordingStatusCallbackMethod: "POST",
        timeout: 60, // Give 60 seconds for the call to be answered
        answerOnBridge: true, // Only answer when the call is bridged (connected)
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
      });

      // Connect to the user's device
      // IMPORTANT: The identity here must match what was used when creating the token
      // If you have multiple users, you need to determine which device to ring
      // For now, using the Twilio phone number as the identity
      const clientIdentity = twilioCredentials.phoneNumber;

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
