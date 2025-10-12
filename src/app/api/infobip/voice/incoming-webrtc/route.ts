import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Find or create client
    let client = await db.client.findFirst({
      where: {
        companyId: infobipConfig.companyId,
        mobile: {
          contains: from.replace("+", ""),
        },
      },
    });

    if (!client) {
      client = await db.client.create({
        data: {
          firstName: "Unknown",
          lastName: "Caller",
          mobile: from,
          companyId: infobipConfig.companyId,
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
      { status: 500 }
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
