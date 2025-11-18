import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callSid, action, companyId, deviceId } = body;

    if (!callSid || !action || !companyId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (action !== "accepted" && action !== "rejected" && action !== "ended") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accepted', 'rejected', or 'ended'" },
        { status: 400 }
      );
    }

    // Determine the status based on action
    let status: string;
    if (action === "accepted") {
      status = "in-progress";
    } else if (action === "rejected") {
      status = "no-answer";
    } else {
      status = "completed";
    }

    // Try to update call status in database (use updateMany to avoid error if not found)
    const updateResult = await db.clientCall.updateMany({
      where: {
        callSid,
        companyId,
      },
      data: {
        status,
      },
    });

    console.log(
      `📊 [DB] Updated ${updateResult.count} call record(s) for callSid: ${callSid}`
    );

    // Broadcast to all devices in the company via Pusher
    // This happens regardless of whether the DB record was found
    // because we still want to dismiss the popup on other devices
    const pusher = getPusherInstance();
    const channelName = `company-${companyId}`;

    // Determine the event name based on action
    let eventName: string;
    if (action === "accepted") {
      eventName = "call-accepted";
    } else if (action === "rejected") {
      eventName = "call-rejected";
    } else {
      eventName = "call-ended";
    }

    await pusher.trigger(channelName, eventName, {
      callSid,
      action,
      deviceId, // Include deviceId so the accepting device knows to keep its modal open
      timestamp: new Date().toISOString(),
    });

    console.log(
      `📡 [Pusher] Broadcasted ${eventName} for call ${callSid} to ${channelName} (deviceId: ${deviceId})`
    );

    return NextResponse.json({
      success: true,
      recordsUpdated: updateResult.count,
    });
  } catch (error) {
    console.error("❌ Error in call-state endpoint:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
