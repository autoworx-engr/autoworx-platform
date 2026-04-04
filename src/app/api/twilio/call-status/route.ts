import { db } from "@/lib/db";
import { twiml } from "twilio";
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
<<<<<<< HEAD
      return NextResponse.json(
        { error: "Missing 'CallSid' parameter." },
        { status: 400 }
      );
=======
      // Return empty TwiML so Twilio doesn't play "application error"
      const errResponse = new twiml.VoiceResponse();
      return new Response(errResponse.toString(), {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f
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
      // Return empty TwiML so Twilio doesn't play "application error"
      const notFoundResponse = new twiml.VoiceResponse();
      return new Response(notFoundResponse.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
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
    const isMissedCall =
      dialCallStatus && missedStatuses.includes(dialCallStatus);

    if (isMissedCall && call.client) {
<<<<<<< HEAD
      console.log(
        "🔔 [Call-Status] Missed call detected, sending alert to client:",
        call.client.mobile
      );

      try {
        const clientName = call.client.firstName
          ? `${call.client.firstName}${call.client.lastName ? " " + call.client.lastName : ""}`
          : "Unknown Caller";

        const companyName = call.company?.name || "our business";
        const message = `You have a missed call from ${companyName}. We'll try to reach you again soon or feel free to call us back.`;

        console.log("Sending SMS via gateway:", call.company?.smsGateway);

        // if (call.company?.smsGateway === "TWILIO") {
        //   const response = await sendTwilioMessage({
        //     companyId: call.company?.id,
        //     clientId: call.client.id,
        //     message: message,
        //     attachments: [],
        //   });

        //   if (!response.success) {
        //     throw new Error(`SMS sending failed`);
        //   }
        //   console.log("✅ [Call-Status] Missed call SMS sent via Twilio");
        // } else if (call.company?.smsGateway === "INFOBIP") {
        //   const response = await sendInfobipMessage({
        //     companyId: call.company?.id,
        //     clientId: call.client.id,
        //     message: message,
        //     attachments: [],
        //   });

        //   if (!response.success) {
        //     throw new Error(`SMS sending failed`);
        //   }
        //   console.log("✅ [Call-Status] Missed call SMS sent via Infobip");
        // } else {
        //   console.warn(
        //     "⚠️ [Call-Status] No SMS gateway configured for company:",
        //     call.company?.id
        //   );
        // }
      } catch (error) {
        console.error(
          "❌ [Call-Status] Failed to send missed call SMS:",
          error
        );
        // Don't throw - we still want to update the call status
=======
      // Check company toggle and plan entitlement before sending
      if (!call.company?.missedCallTextBackEnabled) {
        console.log(
          "⏭️ [Call-Status] Missed call text back is disabled for company, skipping SMS",
        );
      } else {
        const entitlements = await getCompanyEntitlements(call.company.id);
        if (!entitlements.canUseSms || !entitlements.missedCallTextBack) {
          console.log(
            "⏭️ [Call-Status] Missed call text back not included in plan, skipping SMS",
          );
        } else {
          console.log(
            "🔔 [Call-Status] Missed call detected, sending alert to client:",
            call.client.mobile,
          );
          try {
            const companyName = call.company?.name || "our business";
            const message = `Sorry we missed your call! Feel free to text this number with what you need in the meantime and we’ll get back to you as soon as possible. - ${companyName}`;

            if (call.company?.smsGateway === "TWILIO") {
              const response = await sendTwilioMessage({
                companyId: call.company?.id,
                clientId: call.client.id,
                message: message,
                attachments: [],
                systemCall: true,
              });
              if (!response.success) throw new Error(`SMS sending failed`);
              console.log("✅ [Call-Status] Missed call SMS sent via Twilio");
            } else if (call.company?.smsGateway === "INFOBIP") {
              const response = await sendInfobipMessage({
                companyId: call.company?.id,
                clientId: call.client.id,
                message: message,
                attachments: [],
                systemCall: true,
              });
              if (!response.success) throw new Error(`SMS sending failed`);
              console.log("✅ [Call-Status] Missed call SMS sent via Infobip");
            } else {
              console.warn(
                "⚠️ [Call-Status] No SMS gateway configured for company:",
                call.company?.id,
              );
            }
          } catch (error) {
            console.error(
              "❌ [Call-Status] Failed to send missed call SMS:",
              error,
            );
            // Don't throw - we still want to update the call status
          }
        }
>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f
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
        `✅ [Call-Status] Updated call status from ${call.status} to ${newStatus}`
      );
    }

    // Return empty TwiML so Twilio hangs up gracefully instead of playing
    // "We're sorry, an application error has occurred"
    const voiceResponse = new twiml.VoiceResponse();
    return new Response(voiceResponse.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("❌ [Call-Status] Error handling call status:", error);
<<<<<<< HEAD
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
=======
    // Return empty TwiML even on error so Twilio can hang up cleanly
    const errResponse = new twiml.VoiceResponse();
    return new Response(errResponse.toString(), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
>>>>>>> b13cc748f79e5676eb818262729c7aee087e2d7f
  }
}
