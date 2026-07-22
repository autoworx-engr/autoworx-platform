"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { guardOutboundSms, maskPhone } from "@/lib/sms/outboundSmsGuard";
import receiveTwiloMessage from "@/lib/pusher/receiveTwiloMessage";
import { revalidatePath } from "next/cache";
import Twilio from "twilio";
import { updateNewSMSChatTrack } from "./chat-track";
import {
  getTwilioCredentials,
  getTwilioCredentialsById,
} from "./sendTwilioMessage";

export async function sendTwilioMessageSalesAgent({
  companyId,
  message,
  clientId,
  attachments,
  isSalesAgent = false,
}: {
  companyId?: number;
  message: string;
  clientId: number;
  attachments: { url: string; name: string; isVoiceNote?: boolean }[];
  isSalesAgent?: boolean;
}) {
  try {
    let twilioCredentials = companyId
      ? await getTwilioCredentialsById(companyId)
      : await getTwilioCredentials();

    if (!twilioCredentials) {
      return {
        success: false,
        message: "Twilio credential does not setup yet!",
      };
    }

    const twilio = Twilio(
      twilioCredentials.apiKeySid,
      twilioCredentials.apiKeySecret,
      {
        accountSid: twilioCredentials.accountSid,
      },
    );

    const client = await db.client.findFirst({
      where: {
        id: clientId,
      },
      include: {
        Lead: {
          select: {
            id: true,
            columnId: true,
          },
        },
      },
    });

    let to = normalizeUSPhoneNumber(client?.mobile!);

    if (twilioCredentials.phoneNumber && to && clientId) {
      const gate = await guardOutboundSms(to, twilioCredentials.companyId);
      if (gate.allowed) {
        await twilio.messages.create({
          body: message ?? "",
          from: twilioCredentials.phoneNumber,
          to,
          mediaUrl: attachments.map((file) => file.url),
        });
      } else {
        console.warn(
          `[sms] outbound skipped (${gate.reason}); to=${maskPhone(to)}`,
        );
      }

      const dbMessage = await db.clientSMS.create({
        data: {
          from: twilioCredentials.phoneNumber,
          to,
          message: message ?? "",
          sentBy: "Company",
          isRead: true,
          clientId,
          companyId: twilioCredentials.companyId,
          isSalesAgent: Boolean(isSalesAgent),
        },
      });

      const processedAttachments = [];
      for (const file of attachments) {
        let atc = await db.clientSmsAttachments.create({
          data: {
            name: file.name,
            url: file.url,
            isVoiceNote: file.isVoiceNote ?? false,
            clientSMSId: dbMessage.id,
          },
        });
        processedAttachments.push({
          name: file.name,
          url: file.url,
          isVoiceNote: file.isVoiceNote ?? false,
        });
      }

      await updateNewSMSChatTrack({
        clientId,
        smsLastMessage: message ?? "",
        lastMessageBy: "Company",
        attachments: processedAttachments,
      });

      let data = await db.clientSMS.findFirst({
        where: {
          id: dbMessage.id,
        },
        include: {
          attachments: true,
        },
      });

      if (data) {
        await receiveTwiloMessage(data);
      }

      revalidatePath(`/dashboard/communication/client/${clientId}`);

      return {
        success: true,
        data,
      };
    } else {
      throw new Error("Missing required parameters");
    }
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
