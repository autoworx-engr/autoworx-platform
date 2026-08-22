import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import sendNotificationByEmail from "@/actions/notification/sendNotificationByEmail";
import { db } from "../db";

type TEmergencyClientNotifyParams = {
  companyId: number;
  clientId: number;
  requestId: number;
  shopName: string;
  trackingUrl: string;
  contactEmail: string;
  contactName: string;
};

export async function sendEmergencyClientNotification({
  companyId,
  clientId,
  requestId,
  shopName,
  trackingUrl,
  contactEmail,
  contactName,
}: TEmergencyClientNotifyParams): Promise<void> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { smsGateway: true },
  });

  const smsMessage =
    `Hi ${contactName}, your urgent service request (#${requestId}) has been received by ${shopName}. ` +
    `Our team will review it shortly. Track your request status here: ${trackingUrl}`;

  const emailDescription =
    `Hi ${contactName}, your urgent service request (#${requestId}) has been received by ${shopName}. ` +
    `Our team will review it and get back to you shortly.\n\n` +
    `Track your request status: ${trackingUrl}`;

  await Promise.allSettled([
    company?.smsGateway === "TWILIO"
      ? sendTwilioMessage({
          companyId,
          clientId,
          message: smsMessage,
          attachments: [],
        })
      : sendInfobipMessage({
          companyId,
          clientId,
          message: smsMessage,
          attachments: [],
          systemCall: true,
        }),

    sendNotificationByEmail({
      companyId,
      userEmail: contactEmail,
      subject: `Urgent Service Request Received - ${shopName}`,
      description: emailDescription,
    }),
  ]);
}
