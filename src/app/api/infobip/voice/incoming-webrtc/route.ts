import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/actions/notification/sendPushNotification";

/**
 * @swagger
 * /api/infobip/voice/incoming-webrtc:
 *   post:
 *     summary: Infobip WebRTC incoming call webhook
 *     tags: [Infobip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *               callId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incoming call processed
 *       400:
 *         description: Missing parameters
 */
// Webhook endpoint for Infobip WebRTC incoming calls
// This is called by Infobip when someone dials your number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📞 [Infobip WebRTC] Incoming call webhook:", body);

    const from = body.from; // Caller's phone number
    const to = body.to; // Your Infobip number
    const callId = body.callId || body.id;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'from' or 'to' parameters." },
        { status: 400 },
      );
    }

    // Find the Infobip configuration for this phone number
    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        phoneNumber: {
          contains: to.replace("+", ""),
        },
      },
    });

    if (!infobipConfig) {
      console.error(`No Infobip config found for number: ${to}`);
      return NextResponse.json(
        { error: "Infobip configuration not found" },
        { status: 400 },
      );
    }

    const entitlements = await getCompanyEntitlements(infobipConfig.companyId);
    if (!entitlements.canUseVoice) {
      return NextResponse.json(
        { error: "Voice calling is not enabled for this plan." },
        { status: 403 },
      );
    }

    // Find or create client
    const phoneLookup = phoneLookupWhereClause(from);
    let client = await db.client.findFirst({
      where: {
        companyId: infobipConfig.companyId,
        ...(phoneLookup
          ? { OR: phoneLookup }
          : { mobile: { contains: from.replace("+", "") } }),
      },
    });

    if (!client) {
      client = await db.client.create({
        data: {
          firstName: "Unknown",
          lastName: "Caller",
          mobile: normalizePhoneForStorage(from),
          companyId: infobipConfig.companyId,
          isSalesAgent: true,
        },
      });
    }

    // Create ClientCall record
    await db.clientCall.create({
      data: {
        callSid: callId,
        from,
        to,
        status: "ringing",
        direction: "inbound",
        sentBy: "Client",
        companyId: infobipConfig.companyId,
        clientId: client.id,
      },
    });

    // Send push notifications to admin, manager, and sales users only
    try {
      const companyUsers = await db.user.findMany({
        where: {
          companyId: infobipConfig.companyId,
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
            error,
          );
        }),
      );

      await Promise.allSettled(notificationPromises);
      console.log(
        `📱 Push notifications sent to ${companyUsers.length} user(s)`,
      );
    } catch (notificationError) {
      console.error("Error sending push notifications:", notificationError);
      // Continue even if notifications fail
    }

    // Return routing instruction to Infobip
    // This tells Infobip to forward the call to the WebRTC client
    const response = {
      actions: [
        {
          call: {
            from: to,
            endpoint: {
              type: "WEBRTC",
              identity: infobipConfig.phoneNumber, // Identity of the user in browser
            },
          },
        },
      ],
    };

    console.log("✅ [Infobip WebRTC] Routing call to browser:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Infobip WebRTC] Error handling incoming call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Infobip WebRTC incoming call webhook",
  });
}
