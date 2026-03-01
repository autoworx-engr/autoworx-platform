import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

/**
 * @swagger
 * /api/twilio/call-status:
 *   post:
 *     summary: Twilio call status callback webhook
 *     tags: [Twilio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               CallSid:
 *                 type: string
 *               DialCallStatus:
 *                 type: string
 *               CallStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call status processed
 */
export async function POST(request: Request) {
  console.log("📞 [Call-Status] Webhook called at:", new Date().toISOString());
  try {
    const formData = await request.formData();

    // Log all form data for debugging
    const allData: Record<string, any> = {};
    formData.forEach((value, key) => {
      allData[key] = value;
    });
    console.log("📋 [Call-Status] All FormData:", allData);

    const callSid = formData.get("CallSid") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const callStatus = formData.get("CallStatus") as string;

    console.log("📥 [Call-Status] Received:", {
      callSid,
      dialCallStatus,
      callStatus,
    });

    if (!callSid) {
      console.error("❌ [Call-Status] Missing CallSid");
      return NextResponse.json(
        { error: "Missing 'CallSid' parameter." },
        { status: 400 },
      );
    }

    // Find the call record
    const call = await db.clientCall.findFirst({
      where: { callSid },
      include: {
        client: true,
        company: {
          select: {
            id: true,
            name: true,
            smsGateway: true,
            missedCallTextBackEnabled: true,
          },
        },
      },
    });

    if (!call) {
      console.error("❌ [Call-Status] Call not found for callSid:", callSid);
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    console.log("📞 [Call-Status] Call found:", {
      callId: call.id,
      clientId: call.clientId,
      status: call.status,
      dialCallStatus,
      callStatus,
    });

    // Check if the call was not answered
    // DialCallStatus can be: completed, answered, busy, no-answer, failed, canceled
    // We want to send SMS for: no-answer, busy, failed, canceled
    const missedStatuses = ["no-answer", "busy", "failed", "canceled"];
    console.log("🚀 ~ POST ~ missedStatuses:", missedStatuses);
    const isMissedCall =
      dialCallStatus && missedStatuses.includes(dialCallStatus);
    console.log("🚀 ~ POST ~ isMissedCall:", isMissedCall);

    if (isMissedCall && call.client) {
      console.log(
        "🔔 [Call-Status] Missed call detected, sending alert to client:",
        call.client.mobile,
      );

      try {
        const clientName = call.client.firstName
          ? `${call.client.firstName}${call.client.lastName ? " " + call.client.lastName : ""}`
          : "Unknown Caller";

        const companyName = call.company?.name || "our business";
        const message = `You have a missed call from ${companyName}. We'll try to reach you again soon or feel free to call us back.`;

        if (!call.company?.id) {
          console.warn(
            "[Call-Status] Skipping missed call text-back: no company on call record",
          );
          return NextResponse.json({ success: true });
        }

        const entitlements = await getCompanyEntitlements(call.company.id);
        if (
          !entitlements.canUseSms ||
          !entitlements.missedCallTextBack ||
          !call.company?.missedCallTextBackEnabled
        ) {
          console.warn(
            "Missed call text-back disabled by plan or setting for company:",
            call.company?.id,
          );
        } else if (
          process.env.NODE_ENV === "production" &&
          call.company?.smsGateway === "TWILIO"
        ) {
          const response = await sendTwilioMessage({
            companyId: call.company?.id,
            clientId: call.client.id,
            message: message,
            attachments: [],
          });

          if (!response.success) {
            throw new Error(`SMS sending failed`);
          }
          console.log("✅ [Call-Status] Missed call SMS sent via Twilio");
        } else if (
          process.env.NODE_ENV === "production" &&
          call.company?.smsGateway === "INFOBIP"
        ) {
          const response = await sendInfobipMessage({
            companyId: call.company?.id,
            clientId: call.client.id,
            message: message,
            attachments: [],
          });

          if (!response.success) {
            throw new Error(`SMS sending failed`);
          }
          console.log("✅ [Call-Status] Missed call SMS sent via Infobip");
        } else {
          console.warn(
            "⚠️ [Call-Status] No SMS gateway configured for company:",
            call.company?.id,
          );
        }

        console.log("Sending SMS via gateway:", call.company?.smsGateway);
      } catch (error) {
        console.error(
          "❌ [Call-Status] Failed to send missed call SMS:",
          error,
        );
        // Don't throw - we still want to update the call status
      }
    }

    // Update call status based on DialCallStatus
    const dialStatus = dialCallStatus ?? "";
    let newStatus: string = call.status ?? "ringing";
    if (dialStatus === "answered" || dialStatus === "completed") {
      newStatus = "completed";
    } else if (missedStatuses.includes(dialStatus)) {
      newStatus = "no-answer";
    }

    if (newStatus !== call.status) {
      await db.clientCall.update({
        where: { id: call.id },
        data: { status: newStatus },
      });
      console.log(
        `✅ [Call-Status] Updated call status from ${call.status} to ${newStatus}`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [Call-Status] Error handling call status:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
