"use server";
import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { revalidatePath } from "next/cache";
import Twilio from "twilio";

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

export async function sendMessage({
  companyId,
  message,
  clientId,
  attachments,
}: {
  companyId?: number;
  message: string;
  clientId: number;
  attachments: { url: string; name: string }[];
}) {
  try {
    let twilioCredentials = companyId
      ? await getTwilioCredentialsById(companyId)
      : await getTwilioCredentials();

    if (!twilioCredentials) {
      return {
        success: false,
      };
    }

    const twilio = Twilio(
      twilioCredentials.accountSid,
      twilioCredentials.authToken,
    );

    const user = await getUser();
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

      let dbMessage = await db.clientSMS.create({
        data: {
          from: twilioCredentials.phoneNumber,
          to,
          message: message ?? "",
          sentBy: "Company",
          userId: user?.id,
          isRead: true,
          clientId,
          companyId: twilioCredentials.companyId,
        },
      });

      for (const file of attachments) {
        let atc = await db.clientSmsAttachments.create({
          data: {
            name: file.name,
            url: file.url,
            clientSMSId: dbMessage.id,
          },
        });
      }

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
          await updatePipelineAutomationTrigger({
            companyId: client.companyId,
            condition: "MESSAGE_SENT_CLIENT",
            leadId: client?.Lead.id,
            columnId: client?.Lead?.columnId,
          });
          await updateCommunicationAutomationTrigger({
            companyId: client.companyId,
            leadId: client?.Lead.id,
            columnId: client?.Lead?.columnId,
          });
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
