import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const from = body.from; // Caller's phone number
    const to = body.to; // Your Infobip number
    const callId = body.callId || uuidv4();

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing 'from' or 'to' parameters." },
        { status: 400 }
      );
    }

    // Find the Infobip credentials for this phone number
    const infobipConfig = await db.infobipConfig.findFirst({
      where: {
        phoneNumber: {
          contains: to.replace("+", ""),
        },
      },
    });

    if (!infobipConfig) {
      return NextResponse.json(
        { error: "Infobip credentials not found" },
        { status: 400 }
      );
    }

    // Try to find the client
    let client = await db.client.findFirst({
      where: {
        companyId: infobipConfig?.companyId,
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
          companyId: infobipConfig.companyId,
        },
      });
    }

    // Create ClientCall record for incoming call
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

    return NextResponse.json({
      success: true,
      callId,
      clientId: client.id,
      companyId: infobipConfig.companyId,
    });
  } catch (error) {
    console.error("Error handling incoming call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
