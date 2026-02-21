"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { revalidatePath } from "next/cache";
import Twilio from "twilio";
import { updateNewEmailChatTrack, updateNewSMSChatTrack } from "./chat-track";
import { sendSMSToAgent } from "@/service/ai-agent/api";

type TTwilioCredentials = {
  companyId?: number;
};

export async function getTwilioCredentials({
  companyId,
}: TTwilioCredentials = {}) {
  let cId = companyId ?? (await getCompanyId());
  return await db.twilioCredentials.findFirst({
    where: {
      companyId: cId,
    },
  });
}
export async function getTwilioCredentialsById(companyId: number) {
  return await db.twilioCredentials.findFirst({
    where: {
      companyId,
    },
  });
}

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
  attachments: { url: string; name: string }[];
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
      await twilio.messages.create({
        body: message ?? "",
        from: twilioCredentials.phoneNumber,
        to,
        mediaUrl: attachments.map((file) => file.url),
      });

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
            clientSMSId: dbMessage.id,
          },
        });
        processedAttachments.push({
          name: file.name,
          url: file.url,
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

      try {
        if (client?.Lead?.id && client?.Lead?.columnId) {
          if (data?.sentBy == "Company") {
            await updatePipelineAutomationTrigger({
              companyId: client.companyId,
              condition: "MESSAGE_SENT_CLIENT",
              leadId: client?.Lead.id,
              columnId: client?.Lead?.columnId,
            });
          }
        }
      } catch (error) {}

      revalidatePath("/dashboard/communication/client");

      return {
        success: true,
        data,
      };
    } else {
      throw new Error("Missing required parameters");
    }
  } catch (error) {
    console.log("Error sending message", error);
    return {
      success: false,
      error,
    };
  }
}
