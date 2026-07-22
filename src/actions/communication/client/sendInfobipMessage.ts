"use server";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { normalizeUSPhoneNumber } from "@/lib/normalizeUSPhoneNumber";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { revalidatePath } from "next/cache";
import { updateNewSMSChatTrack } from "./chat-track";
import { getInfobipConfigById } from "./createInfobipConfig";

type TInfobipConfig = {
  companyId?: number;
};

export async function getInfobipCredentials({
  companyId,
}: TInfobipConfig = {}) {
  let cId = companyId ?? (await getCompanyId());
  const infobipConfig = await db.infobipConfig.findFirst({
    where: {
      companyId: cId,
    },
  });
  return { success: true, data: infobipConfig };
}

export async function sendInfobipMessage({
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
  isSalesAgent?: boolean;
  userId?: number;
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

    let infobipConfig = companyId
      ? (await getInfobipConfigById(companyId)).data
      : (await getInfobipCredentials()).data;

    if (!infobipConfig) {
      return {
        success: false,
        error: "Infobip configuration not found",
      };
    }

    const company = await db.company.findUnique({
      where: { id: infobipConfig?.companyId },
    });

    let user: Awaited<ReturnType<typeof getUser>> | null = null;
    // try {
    //   user = await getUser();
    // } catch (error) {
    //   console.error(
    //     "sendInfobipMessage: getUser failed, continuing without user context",
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

    if (!client) {
      return {
        success: false,
        error: "Client not found",
      };
    }

    if (!client.mobile) {
      return {
        success: false,
        error: "Client has no phone number",
      };
    }

    let to = normalizeUSPhoneNumber(client.mobile);

    if (!to) {
      return {
        success: false,
        error: "Invalid client phone number",
      };
    }

    if (infobipConfig.phoneNumber && to && clientId) {
      // Normalize phone numbers for MMS compatibility
      const normalizedSender = normalizeUSPhoneNumber(
        infobipConfig.phoneNumber,
      );
      const normalizedRecipient = normalizeUSPhoneNumber(to);

      // Send SMS/MMS via Infobip API
      const infobipApiKey = process.env.INFOBIP_API_KEY;
      const infobipBaseUrl = "https://" + process.env.INFOBIP_BASE_URL;
      let infobipResponse;

      // Helper function to determine content type from file extension
      const getContentTypeFromExtension = (extension: string): string => {
        switch (extension.toLowerCase()) {
          case "jpg":
          case "jpeg":
            return "image/jpeg";
          case "png":
            return "image/png";
          case "gif":
            return "image/gif";
          case "pdf":
            return "application/pdf";
          case "mp4":
            return "video/mp4";
          case "mov":
            return "video/quicktime";
          case "mp3":
            return "audio/mpeg";
          case "wav":
            return "audio/wav";
          case "ogg":
          case "oga":
            return "audio/ogg";
          case "opus":
            return "audio/ogg; codecs=opus";
          case "m4a":
            return "audio/mp4";
          case "webm":
            return "audio/webm";
          case "aac":
            return "audio/aac";
          case "amr":
            return "audio/amr";
          case "3gp":
            return "audio/3gpp";
          default:
            return "image/jpeg"; // Default to image/jpeg for images
        }
      };

      // Helper function to fetch content type from URL
      const getContentTypeFromUrl = async (
        url: string,
        fileName: string,
      ): Promise<string> => {
        try {
          // First try to get from file extension
          const extension =
            fileName.split(".").pop()?.toLowerCase() ||
            url.split(".").pop()?.toLowerCase();

          if (extension && extension !== fileName && extension !== url) {
            return getContentTypeFromExtension(extension);
          }

          // If no extension, fetch the actual content type from the URL
          const response = await fetch(url, { method: "HEAD" });
          const contentType = response.headers.get("content-type");

          if (contentType) {
            return contentType;
          }

          // Default to image/jpeg for technician photos
          return "image/jpeg";
        } catch (error) {
          console.error("Error fetching content type:", error);
          return "image/jpeg";
        }
      };

      // Check if we have attachments to determine if this should be MMS
      if (attachments && attachments.length > 0) {
        // Prepare media segments using direct links (no upload needed)
        const mediaSegments = await Promise.all(
          attachments.map(async (file) => {
            const contentType = await getContentTypeFromUrl(
              file.url,
              file.name,
            );
            const contentId = `${file.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

            return {
              type: "LINK",
              contentId: contentId,
              contentType: contentType,
              contentUrl: file.url,
            };
          }),
        );

        // Send MMS with direct links using v2 API format
        const messageSegments = [];

        // Add text segment if message exists
        if (message && message.trim()) {
          messageSegments.push({
            type: "TEXT",
            text: message,
          });
        }

        // Add media segments
        messageSegments.push(...mediaSegments);

        const mmsPayload = {
          messages: [
            {
              sender: normalizedSender || infobipConfig.phoneNumber,
              destinations: [{ to: normalizedRecipient || to }],
              content: {
                // title: "Some title",
                messageSegments: messageSegments,
              },
            },
          ],
        };

        console.log("MMS Payload:", JSON.stringify(mmsPayload, null, 2));

        infobipResponse = await fetch(`${infobipBaseUrl}/mms/2/messages`, {
          method: "POST",
          headers: {
            Authorization: `App ${infobipApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(mmsPayload),
        });
      } else {
        // Send SMS without attachments
        const smsPayload = {
          messages: [
            {
              sender: normalizedSender || infobipConfig.phoneNumber,
              destinations: [{ to: normalizedRecipient || to }],
              content: {
                text: message,
              },
            },
          ],
        };

        infobipResponse = await fetch(`${infobipBaseUrl}/sms/3/messages`, {
          method: "POST",
          headers: {
            Authorization: `App ${infobipApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(smsPayload),
        });
      }

      if (!infobipResponse.ok) {
        const errorData = await infobipResponse.json();
        console.error("Infobip API error:", errorData);
        return {
          success: false,
          error: `Infobip API error: ${infobipResponse.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const infobipResult = await infobipResponse.json();

      const data = await db.$transaction(async (tx) => {
        const created = await tx.clientSMS.create({
          data: {
            from: infobipConfig!.phoneNumber,
            to,
            message: message ?? "",
            sentBy: "Company",
            userId: user?.id,
            isRead: true,
            clientId,
            companyId: infobipConfig!.companyId,
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
      } catch (error) {
        console.error("Pipeline automation trigger error:", error);
      }

      revalidatePath(`/dashboard/communication/client/${clientId}`);
      return {
        success: true,
        data,
      };
    } else {
      return {
        success: false,
        error: "Missing required parameters",
      };
    }
  } catch (error: any) {
    console.error("Infobip send message error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
