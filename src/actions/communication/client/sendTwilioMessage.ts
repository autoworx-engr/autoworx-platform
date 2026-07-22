"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { guardOutboundSms, maskPhone } from "@/lib/sms/outboundSmsGuard";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { revalidatePath } from "next/cache";
import Twilio from "twilio";
import { updateNewEmailChatTrack, updateNewSMSChatTrack } from "./chat-track";

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
    include: {
      Company: true,
    },
  });
}

export async function sendTwilioMessage({
  companyId,
  message,
  clientId,
  attachments,
  isSalesAgent = false,
  userId,
  systemCall = false,
  shouldSalesAgentStop = true,
}: {
  companyId?: number;
  message: string;
  clientId: number;
  attachments: { url: string; name: string; isVoiceNote?: boolean }[];
  userId?: number;
  isSalesAgent?: boolean;
  /** Pass true when calling from a webhook/system context with no user session. */
  systemCall?: boolean;
  /** When true (default), disables isSalesAgent on the client after sending. */
  shouldSalesAgentStop?: boolean;
}) {
  try {
    const resolvedCompanyId = companyId ?? (await getCompanyId());
    const entitlements = await getCompanyEntitlements(resolvedCompanyId);
    if (!entitlements.canUseSms) {
      return {
        success: false,
        error: "SMS is not enabled for this plan",
      };
    }

    console.log("companyId", companyId);
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

    const company = await db.company.findUnique({
      where: { id: twilioCredentials?.companyId },
    });
    console.log("userId", userId);
    let user: Awaited<ReturnType<typeof getUser>> | null = null;
    // try {
    //   user = await getUser();
    // } catch (error) {
    //   console.log(
    //     "sendTwilioMessage: getUser failed, continuing without user context",
    //     error,
    //   );
    // }

    if (userId) {
      user = await db.user.findFirst({
        where: { id: userId },
      });
    } else if (!systemCall) {
      user = await getUser();
    }

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

      const data = await db.$transaction(async (tx) => {
        const created = await tx.clientSMS.create({
          data: {
            from: twilioCredentials!.phoneNumber,
            to,
            message: message ?? "",
            sentBy: "Company",
            userId: user?.id,
            isRead: true,
            clientId,
            companyId: twilioCredentials!.companyId,
            isSalesAgent,
          },
        });

        if (attachments && attachments.length > 0) {
          await tx.clientSmsAttachments.createMany({
            data: attachments.map((file) => ({
              name: file.name,
              url: file.url,
              isVoiceNote: file.isVoiceNote ?? false,
              clientSMSId: created.id,
            })),
          });
        }

        if (
          shouldSalesAgentStop &&
          client &&
          client?.isSalesAgent &&
          !systemCall &&
          process.env.APP_ENV === "production"
        ) {
          await tx.client.update({
            where: { id: clientId },
            data: { isSalesAgent: false },
          });
        }

        return tx.clientSMS.findFirst({
          where: { id: created.id },
          include: { attachments: true },
        });
      });

      const processedAttachments = (attachments ?? []).map((file) => ({
        name: file.name,
        url: file.url,
        isVoiceNote: file.isVoiceNote ?? false,
      }));

      await updateNewSMSChatTrack({
        clientId,
        smsLastMessage: message ?? "",
        lastMessageBy: "Company",
        attachments: processedAttachments,
      });

      try {
        if (client?.Lead?.id && client?.Lead?.columnId) {
          if (data?.sentBy === "Company") {
            await updatePipelineAutomationTrigger({
              companyId: client.companyId,
              condition: "MESSAGE_SENT_CLIENT",
              leadId: client?.Lead.id,
              columnId: client?.Lead?.columnId,
            });
          }
        }
      } catch (error) {}

      revalidatePath(`/dashboard/communication/client/${clientId}`);

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
