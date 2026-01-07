import Twilio from "twilio";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateNewSMSChatTrack } from "@/actions/communication/client/chat-track";

export async function sendTwilioMessageService({
  companyId,
  message,
  clientId,
  attachments,
}: {
  companyId: number;
  message: string;
  clientId: number;
  attachments: { url: string; name: string }[];
}) {
  const twilioCredentials = await db.twilioCredentials.findFirst({
    where: { companyId },
  });

  if (!twilioCredentials) {
    throw new Error("Twilio credentials not found");
  }

  const twilio = Twilio(
    twilioCredentials.apiKeySid,
    twilioCredentials.apiKeySecret,
    { accountSid: twilioCredentials.accountSid }
  );

  const user = await getUser().catch(() => null);

  const client = await db.client.findFirst({
    where: { id: clientId },
    include: { Lead: true },
  });

  if (!client?.mobile) {
    throw new Error("Client phone number missing");
  }

  const to = normalizeUSPhoneNumber(client.mobile);
  let dbMessage: any = null;
  if (twilioCredentials.phoneNumber && to && clientId) {
    await twilio.messages.create({
      body: message,
      from: twilioCredentials.phoneNumber!,
      to,
      mediaUrl: attachments.map((a) => a.url),
    });

    dbMessage = await db.clientSMS.create({
      data: {
        from: twilioCredentials.phoneNumber!,
        to,
        message,
        sentBy: "Company",
        userId: user?.id,
        isRead: true,
        clientId,
        companyId,
      },
    });
  }

  for (const file of attachments) {
    await db.clientSmsAttachments.create({
      data: {
        name: file.name,
        url: file.url,
        clientSMSId: dbMessage.id,
      },
    });
  }

  await updateNewSMSChatTrack({
    clientId,
    smsLastMessage: message,
    lastMessageBy: "Company",
    attachments,
  });

  if (client.Lead?.id && client.Lead?.columnId) {
    await updatePipelineAutomationTrigger({
      companyId,
      condition: "MESSAGE_SENT_CLIENT",
      leadId: client.Lead.id,
      columnId: client.Lead.columnId,
    });
  }

  return dbMessage;
}
