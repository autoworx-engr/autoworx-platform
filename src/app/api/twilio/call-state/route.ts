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

    if (!callSid || !action || !companyId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    if (action !== "accepted" && action !== "rejected" && action !== "ended") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accepted', 'rejected', or 'ended'" },
        { status: 400 },
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
    let updateResult;
    let updatedCall: any = null;
    try {
      updateResult = await db.clientCall.updateMany({
        where: {
          callSid,
          companyId: Number(companyId),
        },
        data: {
          status,
        },
      });

      // If call was rejected (not answered), fetch the call details to create conversation track
      if (action === "rejected" && updateResult.count > 0) {
        try {
          updatedCall = await db.clientCall.findFirst({
            where: { callSid, companyId },
            select: { id: true, clientId: true, from: true, to: true },
          });

          if (updatedCall?.clientId) {
            await db.clientSMS.create({
              data: {
                from: updatedCall.from,
                to: updatedCall.to,
                message: "You missed a call from this number. Call to respond.",
                sentBy: "Client",
                clientId: updatedCall.clientId,
                companyId: companyId,
              },
            });

            await updateNewSMSChatTrack({
              clientId: updatedCall.clientId,
              smsLastMessage:
                "You missed a call from this number. Call to respond.",
              lastMessageBy: "Client",
              attachments: [],
            });
          }
        } catch (trackError) {
          console.error(
            "[call-state] Failed to create conversation track:",
            trackError,
          );
        }
      }
    } catch (dbError) {
      console.error("[call-state] Database update error:", dbError);
      updateResult = { count: 0 };
    }

    let pusher;
    try {
      pusher = getPusherInstance();
    } catch (pusherError) {
      console.error("[call-state] Failed to get Pusher instance:", pusherError);
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
        `✅ [Pusher] Broadcasted ${eventName} for call ${callSid} to ${channelName} (deviceId: ${deviceId})`,
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
      { status: 500 },
    );
  }
}
