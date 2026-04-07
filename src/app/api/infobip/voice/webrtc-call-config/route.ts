import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/infobip/voice/webrtc-call-config:
 *   post:
 *     summary: Infobip WebRTC call configuration webhook
 *     tags: [Infobip]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               from:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call configuration returned
 *       400:
 *         description: Missing destination phone number
 *       500:
 *         description: Server error
 */
/**
 * Infobip WebRTC Call Configuration Webhook
 *
 * This endpoint is called by Infobip when a WebRTC call is initiated from the browser.
 * It tells Infobip what to do with the call - in this case, connect it to a phone number.
 *
 * Configure this URL in your Infobip WebRTC Application settings:
 * URL: https://your-domain.com/api/infobip/voice/webrtc-call-config
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📞 [Infobip WebRTC] Call configuration webhook called:", body);

    const { to, from, callsConfigurationId, customData } = body;

    // Extract the destination phone number from the request
    // The 'to' parameter contains the destination from device.callPhone(phoneNumber)
    const destinationPhoneNumber = to || customData?.phoneNumber;

    if (!destinationPhoneNumber) {
      console.error("❌ [Infobip WebRTC] No destination phone number provided");
      return NextResponse.json(
        { error: "No destination phone number" },
        { status: 400 },
      );
    }

    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        phoneNumber: {
          contains: (from || "").replace("+", ""),
        },
      },
    });

    if (!infobipConfig) {
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

    console.log(
      `📞 [Infobip WebRTC] Configuring call to: ${destinationPhoneNumber}`,
    );

    // Return the call configuration
    // This tells Infobip to connect the WebRTC call to the specified phone number
    const response = {
      call: {
        endpoint: {
          type: "PHONE",
          phoneNumber: destinationPhoneNumber,
        },
        from: from, // Your Infobip phone number
        // Optional: Add recording configuration
        recording: {
          recordingType: "AUDIO",
        },
      },
    };

    console.log("✅ [Infobip WebRTC] Returning call configuration:", response);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("❌ [Infobip WebRTC] Webhook error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message,
      },
      { status: 500 },
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Infobip WebRTC Call Configuration Webhook",
    status: "active",
  });
}
