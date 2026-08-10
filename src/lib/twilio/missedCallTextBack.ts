import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import "server-only";

/**
 * Writes the "missed call" marker into the SMS thread.
 *
 * A missed call is the reason the auto text-back exists, so the thread reads
 * as a non-sequitur without it. This row is rendered as a divider rather than
 * a bubble — see `messageType` on ClientSMS.
 */
export async function logMissedCallInThread({
  companyId,
  clientId,
  from,
  to,
}: {
  companyId: number;
  clientId: number;
  from: string;
  to: string;
}): Promise<void> {
  try {
    await db.clientSMS.create({
      data: {
        from,
        to,
        message: "Missed call",
        messageType: "MISSED_CALL",
        sentBy: "Client",
        isRead: true,
        clientId,
        companyId,
      },
    });
  } catch (error) {
    console.error("[missedCallTextBack] Failed to log missed call:", error);
  }
}

/**
 * Sends the "sorry we missed your call" auto-text.
 *
 * Lives here rather than inline in the call-status webhook because a call can
 * end up missed through two independent paths — Twilio's status callback
 * (nobody answered, line busy, caller hung up) and `/api/twilio/call-state`
 * (an agent rejected the ringing call in the browser or the mobile app). Both
 * must send the same text-back, otherwise whether the client gets one depends
 * on *how* the call was missed, which is what made it look random per number.
 *
 * Every guard is checked here: company toggle, SMS entitlement, and the
 * missed-call-text-back entitlement. Failures are logged and swallowed — the
 * text-back must never break call handling.
 */
export async function sendMissedCallTextBack({
  companyId,
  clientId,
  call,
}: {
  companyId: number;
  clientId: number;
  /**
   * The missed inbound call, so the thread can show it above the text-back.
   * Callers must not invoke this for outbound calls — a call we placed that
   * went unanswered isn't one we missed.
   */
  call: { from: string; to: string };
}): Promise<void> {
  // The marker goes in first so the thread reads in order: the missed call,
  // then our reply to it. It is written regardless of the text-back settings —
  // the call happened whether or not we auto-reply to it.
  await logMissedCallInThread({
    companyId,
    clientId,
    from: call.from,
    to: call.to,
  });

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        smsGateway: true,
        missedCallTextBackEnabled: true,
      },
    });

    if (!company?.missedCallTextBackEnabled) return;

    const entitlements = await getCompanyEntitlements(companyId);
    if (!entitlements.canUseSms || !entitlements.missedCallTextBack) return;

    const companyName = company.name || "our business";
    const message = `Sorry we missed your call! Feel free to text this number with what you need in the meantime and we'll get back to you as soon as possible. - ${companyName}`;

    if (company.smsGateway === "TWILIO") {
      const response = await sendTwilioMessage({
        companyId,
        clientId,
        message,
        attachments: [],
        systemCall: true,
      });
      if (!response.success) throw new Error("Twilio SMS send failed");
    } else if (company.smsGateway === "INFOBIP") {
      const response = await sendInfobipMessage({
        companyId,
        clientId,
        message,
        attachments: [],
        systemCall: true,
      });
      if (!response.success) throw new Error("Infobip SMS send failed");
    } else {
      console.warn(
        `[missedCallTextBack] Company ${companyId} has no SMS gateway configured; skipping text-back.`,
      );
    }
  } catch (error) {
    console.error(
      "[missedCallTextBack] Failed to send missed call SMS:",
      error,
    );
  }
}
