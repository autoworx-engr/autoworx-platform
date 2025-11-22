import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { twiml } from "twilio";
import { v4 as uuidv4 } from "uuid";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string; // Caller's phone number
    const to = formData.get("To") as string; // Your Twilio number
    const callSid = formData.get("CallSid") as string;

    if (!from || !to) {
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

    if (!twilioCredentials) {
      return NextResponse.json(
        { error: "Twilio credentials not found" },
        { status: 400 }
      );
    }

    // Try to find the client
    let client = await db.client.findFirst({
      where: {
        companyId: twilioCredentials?.companyId,
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
          companyId: twilioCredentials.companyId,
        },
      });
    }

    const callId = callSid || uuidv4();

    // Create ClientCall record for incoming call
    await db.clientCall.create({
      data: {
        callSid: callId,
        from,
        to,
        status: "ringing",
        direction: "inbound",
        sentBy: "Client",
        companyId: twilioCredentials.companyId,
        clientId: client.id,
      },
    });

    // Send push notifications to admin, manager, and sales users only
    try {
      const companyUsers = await db.user.findMany({
        where: {
          companyId: twilioCredentials.companyId,
          active: true,
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

    // Dial to the client identity (the browser device)
    const dial = voiceResponse.dial({
      record: "record-from-answer",
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-recording?callId=${callId}`,
      recordingStatusCallbackMethod: "POST",
      timeout: 60, // Give 60 seconds for the call to be answered
      answerOnBridge: true, // Only answer when the call is bridged (connected)
    });

    // Connect to the user's device
    // IMPORTANT: The identity here must match what was used when creating the token
    // If you have multiple users, you need to determine which device to ring
    // For now, using the Twilio phone number as the identity
    const clientIdentity = twilioCredentials.phoneNumber;
    dial.client(clientIdentity);

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
