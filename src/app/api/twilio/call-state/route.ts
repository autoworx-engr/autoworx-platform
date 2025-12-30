import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextResponse } from "next/server";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";

/**
 * @swagger
 * /api/twilio/call-state:
 *   post:
 *     summary: Update Twilio call state
 *     tags: [Twilio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callSid:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [accepted, rejected, ended]
 *               companyId:
 *                 type: integer
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call state updated
 *       400:
 *         description: Missing required parameters
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callSid, action, companyId, deviceId } = body;

    console.log("📥 [call-state] Received request:", {
      callSid,
      action,
      companyId,
      deviceId,
    });

    if (!callSid || !action || !companyId) {
      console.error("❌ [call-state] Missing required parameters:", {
        callSid,
        action,
        companyId,
      });
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (action !== "accepted" && action !== "rejected" && action !== "ended") {
      console.error("❌ [call-state] Invalid action:", action);
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

    console.log(
      `📊 [DB] Attempting to update callSid: ${callSid} to status: ${status}`
    );

    // Try to update call status in database (use updateMany to avoid error if not found)
    let updateResult;
    let updatedCall: any = null;
    try {
      updateResult = await db.clientCall.updateMany({
        where: {
          callSid,
          companyId,
        },
        data: {
          status,
        },
      });
      console.log(
        `✅ [DB] Updated ${updateResult.count} call record(s) for callSid: ${callSid}`
      );

      // If call was rejected (not answered), fetch the call details to create conversation track
      if (action === "rejected" && updateResult.count > 0) {
        try {
          updatedCall = await db.clientCall.findFirst({
            where: { callSid, companyId },
            select: { id: true, clientId: true, from: true, to: true },
          });

          if (updatedCall?.clientId) {
            console.log(
              `📝 [DB] Creating "missed call" SMS record for client: ${updatedCall.clientId}`
            );

            // Create SMS record for missed call
            const dbMessage = await db.clientSMS.create({
              data: {
                from: updatedCall.from,
                to: updatedCall.to,
                message: "You missed a call from this number. Call to respond.",
                sentBy: "Client",
                clientId: updatedCall.clientId,
                companyId: companyId,
              },
            });
            console.log(
              `✅ [DB] SMS record created for missed call, id: ${dbMessage.id}`
            );

            // Create conversation track
            await updateNewSMSChatTrack({
              clientId: updatedCall.clientId,
              smsLastMessage:
                "You missed a call from this number. Call to respond.",
              lastMessageBy: "Client",
              attachments: [],
            });
            console.log(`✅ [DB] Conversation track created for missed call`);
          }
        } catch (trackError) {
          console.error(
            "❌ [DB] Failed to create conversation track:",
            trackError
          );
          // Continue anyway - this is not critical
        }
      }

      // If no records were updated, check what's actually in the database
      if (updateResult.count === 0) {
        console.warn(
          `⚠️ [DB] No records found for callSid: ${callSid}, checking database...`
        );
        const existingCall = await db.clientCall.findFirst({
          where: { callSid },
          select: {
            id: true,
            callSid: true,
            status: true,
            companyId: true,
            createdAt: true,
          },
        });

        if (existingCall) {
          console.log(`📋 [DB] Found call in database:`, existingCall);
          console.log(
            `⚠️ [DB] Company mismatch? Expected: ${companyId}, Found: ${existingCall.companyId}`
          );
        } else {
          console.warn(
            `❌ [DB] No call record exists with callSid: ${callSid}`
          );
          // Check for recent calls in this company
          const recentCalls = await db.clientCall.findMany({
            where: {
              companyId,
              createdAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
              },
            },
            select: {
              callSid: true,
              status: true,
              from: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          });
          console.log(
            `📋 [DB] Recent calls for company ${companyId}:`,
            recentCalls
          );
        }
      }
    } catch (dbError) {
      console.error("❌ [DB] Database update error:", dbError);
      // Continue with Pusher broadcast even if DB update fails
      updateResult = { count: 0 };
    }

    // Broadcast to all devices in the company via Pusher
    // This happens regardless of whether the DB record was found
    // because we still want to dismiss the popup on other devices
    console.log("📡 [Pusher] Preparing to broadcast...");

    let pusher;
    try {
      pusher = getPusherInstance();
      console.log("✅ [Pusher] Instance obtained");
    } catch (pusherError) {
      console.error("❌ [Pusher] Failed to get Pusher instance:", pusherError);
      // Return success anyway since DB update succeeded
      return NextResponse.json({
        success: true,
        recordsUpdated: updateResult.count,
        pusherError: "Failed to get Pusher instance",
      });
    }

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

    try {
      await pusher.trigger(channelName, eventName, {
        callSid,
        action,
        deviceId, // Include deviceId so the accepting device knows to keep its modal open
        timestamp: new Date().toISOString(),
      });

      console.log(
        `✅ [Pusher] Broadcasted ${eventName} for call ${callSid} to ${channelName} (deviceId: ${deviceId})`
      );
    } catch (pusherError) {
      console.error("❌ [Pusher] Broadcast error:", pusherError);
      // Continue anyway - DB update is more important
    }

    return NextResponse.json({
      success: true,
      recordsUpdated: updateResult.count,
    });
  } catch (error) {
    console.error("❌ [call-state] Unexpected error:", error);
    console.error("❌ [call-state] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
